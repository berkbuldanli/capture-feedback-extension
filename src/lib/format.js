// format.js
// ------------------------------------------------------------------
// Small formatting helpers shared by the popup and the dashboard.
// Keeping them in one place means we only write (and fix) them once.
// ------------------------------------------------------------------

/** Turn a millisecond timestamp into a short, readable date/time. */
export function formatDate(ms) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A longer, friendlier date (used on the roomy dashboard). */
export function formatDateFull(ms) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Show just the site's domain instead of the whole long URL. */
export function shortUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}

/** Pick a stable, pleasant colour for a site's letter-avatar. */
export function avatarColor(seed) {
  seed = seed || "•";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 55%, 45%)`;
}

/** The first letter to show inside a card's avatar. */
export function avatarLetter(card) {
  const domain = shortUrl(card.url);
  return (domain[0] || card.title[0] || "•").toUpperCase();
}

// ------------------------------------------------------------------
// Security helpers.
// Card data can come from an imported JSON file, which is untrusted.
// These functions make sure a URL, image, or colour is safe to put
// into the page. Without them, a crafted import file could, for
// example, use a `javascript:` link to run code in the extension.
// ------------------------------------------------------------------

// Only these link schemes are allowed to become clickable.
const SAFE_LINK_SCHEMES = new Set(["http:", "https:"]);

/**
 * Return the URL if it's a safe, clickable web link; otherwise "".
 * Blocks javascript:, data:, file:, blob:, chrome:, etc.
 */
export function safeUrl(url) {
  try {
    const u = new URL(String(url));
    return SAFE_LINK_SCHEMES.has(u.protocol) ? u.href : "";
  } catch {
    return ""; // relative/blank/garbage → not a safe absolute link
  }
}

/** True only for `data:image/...` URLs (safe to use as an <img> source). */
export function isImageDataUrl(value) {
  return typeof value === "string" && /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(value);
}

/**
 * Return the colour if it's a simple, safe CSS colour; otherwise "".
 * Prevents tricks like `url(http://tracker/…)` being set as a background.
 */
export function safeColor(value) {
  const v = String(value || "").trim();
  const ok =
    /^#[0-9a-f]{3,8}$/i.test(v) ||
    /^hsl\(\s*[\d.]+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*\)$/i.test(v) ||
    /^rgb\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\)$/i.test(v);
  return ok ? v : "";
}

/** Turn a card into clean Markdown (for pasting into Notion/Docs/Slack). */
export function markdownForCard(card) {
  const lines = [`### ${card.title}`, card.url];
  if (card.text) lines.push("", `> ${card.text.replace(/\n/g, "\n> ")}`);
  if (card.note) lines.push("", `_${card.note}_`);
  if (card.tags.length) lines.push("", card.tags.map((t) => `#${t}`).join(" "));
  lines.push("", `_Saved ${formatDate(card.createdAt)}_`);
  return lines.join("\n");
}
