// background.js
// ------------------------------------------------------------------
// The "background service worker": an invisible helper the browser wakes
// up when something happens (a right-click menu click or the keyboard
// shortcut). It has no visible window.
//
// Its jobs:
//   1. On install, show a friendly welcome page.
//   2. Create the "Save to Quick Capture" right-click menu item.
//   3. Save a card (with an optional screenshot) from the menu or shortcut.
// ------------------------------------------------------------------

import { addCard, getSettings } from "./lib/storage.js";
import { captureThumbnail } from "./lib/capture.js";

const MENU_ID = "quick-capture-save-selection";

// ------------------------------------------------------------------
// 1) On install/update: create the menu and (first install only) open
//    the welcome page so new users know how to use the extension.
// ------------------------------------------------------------------
chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Save to Quick Capture",
      contexts: ["selection"],
    });
  });

  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/welcome/welcome.html") });
  }
});

// ------------------------------------------------------------------
// 2) Right-click menu click → save selected text (+ screenshot).
// ------------------------------------------------------------------
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  await addCard({
    title: tab?.title || "",
    url: tab?.url || info.pageUrl || "",
    text: info.selectionText || "",
    tags: [],
    thumb: await maybeCapture(tab),
  });

  flashBadge();
});

// ------------------------------------------------------------------
// 3) Keyboard shortcut → save the current page (+ any selection + screenshot).
// ------------------------------------------------------------------
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "quick-save") return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  await addCard({
    title: tab.title || "",
    url: tab.url || "",
    text: await getSelectionText(tab.id),
    tags: [],
    thumb: await maybeCapture(tab),
  });

  flashBadge();
});

/** Capture a thumbnail only if the user's setting allows it. */
async function maybeCapture(tab) {
  if (!tab?.windowId) return "";
  const settings = await getSettings();
  if (!settings.captureScreenshots) return "";
  return captureThumbnail(tab.windowId);
}

/** Ask a page for any highlighted text ("" if none or the page is protected). */
async function getSelectionText(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection().toString(),
    });
    return results?.[0]?.result || "";
  } catch {
    return "";
  }
}

/** Briefly show a green check badge on the toolbar icon to confirm a save. */
function flashBadge() {
  chrome.action.setBadgeBackgroundColor({ color: "#16a34a" });
  chrome.action.setBadgeText({ text: "✓" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1500);
}
