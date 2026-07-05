# Quick Capture

A tiny, delightful browser extension for product managers. Click the toolbar
icon (or right-click highlighted text, or press a keyboard shortcut) to save the
current page as a **card** with the selected text, page title, URL, and date.

Everything is stored **locally in your browser** — no accounts, no server, no
external services. Built with the standard WebExtensions API and **Manifest V3**,
so it runs on both **Chrome** and **Firefox** from the same code.

## Features

- **Three ways to capture:** the toolbar button, the right-click menu, or the
  <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> keyboard shortcut.
- **Tags + notes:** organise each card with tags and your own note.
- **Find anything:** full-text search, filter by tag (chips are clickable), and
  sort by newest/oldest.
- **Pin** important cards to the top with a star.
- **Edit** a card's note and tags any time.
- **Copy as Markdown** — one click to paste a card into Notion, Docs, or Slack.
- **Export / Import** all your cards as a JSON file for backup or moving devices.
- **Dark mode** that follows your system theme automatically.
- A friendly **empty state** and coloured per-site avatars.

---

## Project layout

```
capture-feedback-extension/
├── manifest.json          # The extension's "ID card" (name, permissions, files)
├── icons/                 # Toolbar icons (16, 48, 128 px)
└── src/
    ├── background.js       # Invisible helper: powers the right-click menu
    ├── lib/
    │   └── storage.js      # Shared save/load functions (the "database" layer)
    └── popup/
        ├── popup.html      # The window that opens when you click the icon
        ├── popup.css       # How the popup looks
        └── popup.js        # How the popup behaves
```

---

## Understanding `manifest.json`

JSON files can't have comments, so here's what each part means:

- **`manifest_version: 3`** — uses the modern extension format (required by Chrome).
- **`name` / `version` / `description`** — shown on the extensions page and in stores.
- **`permissions`** — what the extension may do. We keep this minimal:
  - `storage` — save cards locally.
  - `contextMenus` — add the right-click "Save to Quick Capture" item.
  - `activeTab` — read the current tab's title/URL/selection **only when you click** the icon.
  - `scripting` — run the tiny "what text is highlighted?" check inside the page.
- **`action`** — the toolbar button and the popup it opens.
- **`background.service_worker`** — the invisible helper (`background.js`) that powers the right-click menu and keyboard shortcut.
- **`commands`** — registers the <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> quick-save shortcut. You can change the key at `chrome://extensions/shortcuts`.
- **`browser_specific_settings.gecko`** — a required add-on id for Firefox. Chrome ignores this, so one manifest works in both browsers.

---

## How to load it in Chrome (takes ~1 minute)

1. Open Chrome and go to `chrome://extensions` (type it in the address bar).
2. Turn on **Developer mode** using the toggle in the **top-right** corner.
3. Click **Load unpacked** (top-left).
4. Select this project folder (`capture-feedback-extension`) and click **Select**.
5. The **Quick Capture** icon appears in your toolbar. If you don't see it,
   click the puzzle-piece icon and **pin** it.

**Try it:**
- Go to any normal website (e.g. a news article).
- Highlight some text, click the **Quick Capture** icon, add a tag like
  `competitor` and a note, then click **＋ Save this page**.
- Or highlight text, **right-click** → **Save to Quick Capture**.
- Or press <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> to save without opening anything.
- Open the popup to search, filter, sort, pin, edit, copy-as-Markdown, and
  export/import your cards.

> After you change any code, return to `chrome://extensions` and click the
> **reload** (↻) icon on the Quick Capture card to load your changes.

---

## How to load it in Firefox

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…**.
3. Select the `manifest.json` file inside this folder.

(The add-on stays until you restart Firefox, which is normal for temporary
add-ons during development.)

---

## Notes

- **Blocked pages:** browser system pages (`chrome://…`), the extension
  gallery, and some PDF viewers don't allow extensions to read them, so
  capturing there is disabled. Any normal website works fine.
- **Where's my data?** In the browser's built-in `storage.local`. It stays on
  your computer and survives restarts. Removing the extension removes the data.
