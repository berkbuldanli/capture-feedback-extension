# Quick Capture — QA & Testing Guide

This is a manual test plan you can run to verify everything works. Each
scenario has **Steps** and the **Expected** result. Tick the box when it passes.

> Tip: keep the `chrome://extensions` page open in another tab. After changing
> any code, click the **reload ↻** button on the Quick Capture card, then reload
> the dashboard/welcome tabs.

---

## 0. Setup

### 0.1 Load in Chrome
1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select the project folder.
4. Pin the icon (🧩 → pin) so it's visible.

- [ ] The **Quick Capture** icon appears with no errors on the card.
- [ ] A **welcome tab** opens automatically (first install only).

### 0.2 Load in Firefox
1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and pick `manifest.json`.

- [ ] Loads with no errors listed.

### 0.3 Reset test data (between runs)
Open the popup → dashboard, or run this in the dashboard's DevTools console
(F12) to wipe everything and start clean:
```js
chrome.storage.local.clear()
```
Then reload the page.

---

## 1. Onboarding

**1.1 First-run welcome**
- Steps: Remove the extension, then load it again (fresh install).
- [ ] Expected: A welcome tab opens on install explaining the three capture methods.

**1.2 Sample data**
- Steps: On the welcome page, click **Load a few sample cards** (with no existing cards).
- [ ] Expected: A confirmation appears; 4 sample cards + a "Q3 Research" collection are created.

**1.3 Sample data guard**
- Steps: Click **Load a few sample cards** again when cards already exist.
- [ ] Expected: It does NOT duplicate; a message says samples were skipped.

**1.4 Open dashboard button**
- Steps: Click **Open the dashboard** on the welcome page.
- [ ] Expected: The dashboard opens in a new tab and shows your cards.

---

## 2. Capturing

**2.1 Save via popup (basic)**
- Steps: Open a normal website (e.g. a news article). Click the icon → **Save this page**.
- [ ] Expected: A card appears with the correct title, domain, and date. The count badge increases.

**2.2 Save with a highlighted quote**
- Steps: Highlight a sentence on the page, open the popup, click **Save this page**.
- [ ] Expected: The saved card includes the highlighted text as a quote.

**2.3 Save with tags + note**
- Steps: In the popup, type `competitor, pricing` in tags and a note, then save.
- [ ] Expected: The card shows both tag chips and the note text.

**2.4 Right-click menu**
- Steps: Highlight text → right-click → **Save to Quick Capture**.
- [ ] Expected: A green ✓ badge flashes on the icon; opening the popup shows the new card with the quote.

**2.5 Keyboard shortcut**
- Steps: On any page press **Alt+Shift+S**.
- [ ] Expected: The ✓ badge flashes and a card is saved (no popup needed).
- Note: if the shortcut does nothing, another app may own it — check `chrome://extensions/shortcuts`.

**2.6 Screenshot ON**
- Steps: Ensure the **📷 Shot** toggle is checked, then save a normal page.
- [ ] Expected: The card shows a small screenshot thumbnail of the page.

**2.7 Screenshot OFF (and it's remembered)**
- Steps: Uncheck **📷 Shot**, save a page. Close and reopen the popup.
- [ ] Expected: The new card has NO thumbnail, and the toggle is still unchecked after reopening.

**2.8 Protected page**
- Steps: Open `chrome://extensions` (or the Chrome Web Store) and try to save via the popup.
- [ ] Expected: It fails gracefully with a toast like "Can't capture this page" — no crash.

---

## 3. Organising

**3.1 Collections — create on save**
- Steps: In the popup collection dropdown choose **＋ New collection…**, name it "Research", save a page.
- [ ] Expected: The card shows a "🗂 Research" chip; "Research" now appears in the dropdown.

**3.2 Clickable tag chip (popup)**
- Steps: Click a tag chip on any card in the popup.
- [ ] Expected: The tag filter switches to that tag and the list narrows.

**3.3 Pin**
- Steps: Click **☆ Pin** on a card.
- [ ] Expected: The card gets a star + amber accent and moves to the top of the list.

**3.4 Edit note + tags**
- Steps: Click **✎ Edit**, change the note and tags, click **Save**.
- [ ] Expected: The card updates; a new tag appears in the tag filter dropdown.

**3.5 Copy as Markdown**
- Steps: Click **⧉ Copy** on a card, then paste into a text editor.
- [ ] Expected: Clean Markdown with the title, URL, quote, note, tags, and date.

**3.6 Delete**
- Steps: Click **🗑 Delete** on a card.
- [ ] Expected: The card disappears and the count decreases.

---

## 4. Search / filter / sort (popup)

**4.1 Search**
- Steps: Type a word you know is in one card's title/quote/note.
- [ ] Expected: Only matching cards remain; clearing the box restores all.

**4.2 Tag filter**
- Steps: Pick a tag from the tag dropdown.
- [ ] Expected: Only cards with that tag show.

**4.3 Sort**
- Steps: Switch **Newest / Oldest**.
- [ ] Expected: Order flips, but pinned cards always stay on top.

**4.4 No-results state**
- Steps: Search for gibberish like `zzzzz`.
- [ ] Expected: A "No cards match your search" message shows (not the empty-state illustration).

**4.5 Empty state**
- Steps: Delete all cards.
- [ ] Expected: The illustrated "No cards yet" empty state with tips appears.

---

## 5. Dashboard

**5.1 Open dashboard**
- Steps: Click the **⛶** button in the popup header.
- [ ] Expected: A full-page tab opens with a sidebar, board, and stats.

**5.2 Sidebar filters**
- Steps: Click **All / ★ Pinned / Untagged**, then a tag, then a collection.
- [ ] Expected: The board updates for each; the active filter is highlighted; counts look correct.

**5.3 Stats**
- [ ] Expected: The sidebar footer shows total cards, tags, and "with a quote" counts that match reality.

**5.4 Create collection (sidebar)**
- Steps: Click the **＋** next to "Collections", name it.
- [ ] Expected: It appears in the sidebar with a colour dot and count 0, and becomes the active filter.

**5.5 Rename / delete collection**
- Steps: Hover a collection row; click **✎** to rename, **✕** to delete.
- [ ] Expected: Rename updates everywhere; delete removes the collection but KEEPS its cards (they become ungrouped).

**5.6 Bulk select**
- Steps: Tick several card checkboxes (or the **Select all** box).
- [ ] Expected: The bulk toolbar appears and shows "N selected".

**5.7 Bulk tag**
- Steps: Select cards → **＋ Tag** → enter `reviewed`.
- [ ] Expected: All selected cards gain the `reviewed` tag.

**5.8 Bulk move**
- Steps: Select cards → **🗂 Move** → type a collection name (or blank to ungroup).
- [ ] Expected: Selected cards move into that collection (created if new); blank removes them from any collection.

**5.9 Bulk copy**
- Steps: Select 2+ cards → **⧉ Copy**, then paste.
- [ ] Expected: Multiple Markdown blocks separated by `---`.

**5.10 Bulk export**
- Steps: Select cards → **⤓ Export**.
- [ ] Expected: A `quick-capture-selected-YYYY-MM-DD.json` file downloads with only those cards.

**5.11 Bulk delete**
- Steps: Select cards → **🗑 Delete** → confirm.
- [ ] Expected: All selected cards are removed after the confirmation prompt.

**5.12 Title sort**
- Steps: Set **Sort → Title A–Z**.
- [ ] Expected: Cards order alphabetically by title (pinned still first).

---

## 6. Export / Import

**6.1 Export all**
- Steps: Popup or dashboard → **Export**.
- [ ] Expected: A `.json` file downloads containing your cards AND collections.

**6.2 Import (merge)**
- Steps: Wipe data, then **Import** the file from 6.1.
- [ ] Expected: Cards and collections are restored; a toast shows how many were added.

**6.3 Re-import is safe**
- Steps: Import the same file again.
- [ ] Expected: Everything is "skipped" (no duplicates created).

**6.4 Bad file**
- Steps: Try to import a random non-JSON file.
- [ ] Expected: A friendly "Import failed" toast — no crash.

---

## 7. Appearance

**7.1 Dark mode (auto)**
- Steps: Set your OS to dark mode; reopen the popup and dashboard.
- [ ] Expected: Both switch to a dark theme automatically and remain readable.

**7.1b Theme toggle (manual override)**
- Steps: Click the theme button (🖥️/☀️/🌙) in the popup or dashboard header. Cycle System → Light → Dark.
- [ ] Expected: The colours change immediately; forcing Dark works even if your OS is in Light mode. The choice is remembered after closing/reopening, and the popup and dashboard share the same setting.

**7.2 Long content**
- Steps: Save a page with a very long title and a long highlighted paragraph.
- [ ] Expected: Text wraps neatly; nothing overflows or breaks the layout.

---

## 8. Packaging (developer)

**8.1 Build a store zip**
- Steps: Run `node scripts/build.mjs`.
- [ ] Expected: `dist/quick-capture-v<version>.zip` is created and opens/extracts correctly.

**8.2 Load the built zip**
- Steps: Unzip it into a folder and **Load unpacked** that folder.
- [ ] Expected: The extension loads and behaves exactly like the source.

---

## 9. Cross-browser sanity (Firefox)

Repeat these core scenarios in Firefox: **2.1, 2.4, 2.5, 3.1, 5.1, 6.1/6.2**.
- [ ] All pass in Firefox as they do in Chrome.

---

## Regression checklist (quick smoke test)

- [ ] Save a page (popup) → card appears
- [ ] Right-click save works
- [ ] Alt+Shift+S works
- [ ] Screenshot toggle respected
- [ ] Tags, notes, collection saved and shown
- [ ] Search, tag filter, sort work
- [ ] Pin / edit / copy / delete work
- [ ] Dashboard opens; sidebar filters + stats correct
- [ ] Bulk tag/move/copy/export/delete work
- [ ] Export → wipe → import restores everything
- [ ] Dark mode looks right
- [ ] No errors in the extension's console (`chrome://extensions` → "service worker" / "Inspect views")
