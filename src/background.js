// background.js
// ------------------------------------------------------------------
// The "background service worker": an invisible helper that the browser
// wakes up when something happens (a right-click menu click, or the
// keyboard shortcut). It does NOT have a visible window.
//
// Its jobs:
//   1. Create the "Save to Quick Capture" right-click menu item.
//   2. Save a card when that menu item is clicked on selected text.
//   3. Save the current page when the keyboard shortcut is pressed.
// ------------------------------------------------------------------

import { addCard } from "./lib/storage.js";

// A unique id we use to recognise OUR menu item among all right-click items.
const MENU_ID = "quick-capture-save-selection";

// ------------------------------------------------------------------
// 1) Create the right-click menu item (runs on install/update).
// ------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  // Remove any old copy first so we never create duplicates.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Save to Quick Capture",
      // "selection" means this item only appears when text is highlighted.
      contexts: ["selection"],
    });
  });
});

// ------------------------------------------------------------------
// 2) Handle clicks on the right-click menu item.
// ------------------------------------------------------------------
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  await addCard({
    title: tab?.title || "",
    url: tab?.url || info.pageUrl || "",
    text: info.selectionText || "",
    tags: [],
  });

  flashBadge();
});

// ------------------------------------------------------------------
// 3) Handle the keyboard shortcut (defined as "quick-save" in the
// manifest). This saves the current page — including any highlighted
// text — without even opening the popup.
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
  });

  flashBadge();
});

/**
 * Ask a page for any highlighted text. Returns "" if nothing is
 * selected or the page blocks scripts (e.g. chrome:// pages).
 */
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

/**
 * Briefly show a green check badge on the toolbar icon to confirm a save.
 */
function flashBadge() {
  chrome.action.setBadgeBackgroundColor({ color: "#16a34a" }); // green
  chrome.action.setBadgeText({ text: "✓" });
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1500);
}
