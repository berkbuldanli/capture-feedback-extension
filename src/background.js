// background.js
// ------------------------------------------------------------------
// The "background service worker": an invisible helper that the browser
// wakes up when something happens (like a right-click menu click).
// It does NOT have a visible window.
//
// Its jobs in version 1:
//   1. Create the "Save to Quick Capture" right-click menu item.
//   2. When that menu item is clicked on selected text, save a card.
// ------------------------------------------------------------------

import { addCard } from "./lib/storage.js";

// A unique id we use to recognise OUR menu item among all right-click items.
const MENU_ID = "quick-capture-save-selection";

// ------------------------------------------------------------------
// 1) Create the right-click menu item.
// `onInstalled` runs once when the extension is installed or updated,
// which is the correct place to register context menus.
// ------------------------------------------------------------------
chrome.runtime.onInstalled.addListener(() => {
  // Remove any old copy first so we never create duplicates.
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Save to Quick Capture',
      // "selection" means this item only appears when the user has
      // highlighted some text — exactly the flow you described.
      contexts: ["selection"],
    });
  });
});

// ------------------------------------------------------------------
// 2) Handle clicks on the menu item.
// `info` describes what was clicked (including the selected text).
// `tab` describes the page it happened on (title + URL).
// ------------------------------------------------------------------
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // Ignore clicks on menu items that aren't ours.
  if (info.menuItemId !== MENU_ID) return;

  await addCard({
    title: tab?.title || "",
    url: tab?.url || info.pageUrl || "",
    text: info.selectionText || "",
    tags: [], // right-click saves have no tags; add tags later in the popup
  });

  // Give a small visual confirmation on the toolbar icon (a "1" badge
  // that fades away). This is optional polish, not core logic.
  flashBadge();
});

/**
 * Briefly show a green badge on the toolbar icon to confirm a save.
 */
function flashBadge() {
  chrome.action.setBadgeBackgroundColor({ color: "#16a34a" }); // green
  chrome.action.setBadgeText({ text: "✓" });
  // Clear it after a moment.
  setTimeout(() => chrome.action.setBadgeText({ text: "" }), 1500);
}
