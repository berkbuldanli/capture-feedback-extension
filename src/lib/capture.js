// capture.js
// ------------------------------------------------------------------
// Takes a small screenshot ("thumbnail") of the current tab so each
// card can show a picture of the page it came from.
//
// How it works:
//   1) chrome.tabs.captureVisibleTab() grabs what's on screen as an image.
//   2) We shrink it down and re-compress it as a small JPEG so it doesn't
//      take up much storage space.
//
// This is best-effort: some pages (chrome://, the Web Store, PDFs) can't
// be captured, in which case we simply return "" and the card has no image.
// ------------------------------------------------------------------

const MAX_WIDTH = 480; // thumbnails are shrunk to at most this many pixels wide
const JPEG_QUALITY = 0.6;

/**
 * Capture a thumbnail of the visible area of the given window's active tab.
 * @param {number} windowId
 * @returns {Promise<string>} a data URL for the image, or "" on failure.
 */
export async function captureThumbnail(windowId) {
  try {
    const fullDataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format: "jpeg",
      quality: 70,
    });
    return await downscale(fullDataUrl);
  } catch {
    return "";
  }
}

/** Shrink a data-URL image down to a small JPEG. */
async function downscale(dataUrl) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);

    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    // OffscreenCanvas works in BOTH the popup and the background worker.
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const outBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
    return await blobToDataURL(outBlob);
  } catch {
    // If anything about resizing fails, fall back to the original image.
    return dataUrl;
  }
}

/**
 * Convert a Blob to a data URL. We avoid FileReader because it isn't
 * available in the background service worker, so we base64-encode the
 * bytes ourselves (in chunks, to stay safe with large images).
 */
async function blobToDataURL(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}
