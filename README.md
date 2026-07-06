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
- **Tags, notes, screenshots & collections:** organise each card however you like.
- **Screenshots:** save a thumbnail of the page with each card (toggle on/off).
- **Collections:** group cards into named projects, with colour dots and counts.
- **Find anything:** full-text search, filter by tag/collection, sort by date or title.
- **Pin** important cards to the top with a star.
- **Edit** a card's note and tags any time.
- **Copy as Markdown** — one click to paste a card into Notion, Docs, or Slack.
- **Export / Import** cards *and* collections as a JSON file for backup.
- **Dark mode** that follows your system theme, or force **Light / Dark** with the theme toggle.
- A friendly **welcome page** on first install (with optional sample data).
- **Full-page dashboard** (⛶ button in the popup) with a tag/collection sidebar,
  live stats, a multi-column board, and **bulk actions** — select many cards and
  tag, move, copy, export, or delete them all at once.

---

## Project layout

```
capture-feedback-extension/
├── manifest.json          # The extension's "ID card" (name, permissions, files)
├── icons/                 # Toolbar icons (16, 48, 128 px)
├── src/
│   ├── background.js       # Invisible helper: right-click menu + keyboard shortcut
│   ├── lib/
│   │   ├── storage.js      # Cards, collections & settings (the "database" layer)
│   │   ├── format.js       # Shared formatting helpers (dates, avatars, Markdown)
│   │   └── capture.js      # Takes + shrinks the page screenshots
│   ├── popup/              # The small window from the toolbar icon
│   ├── dashboard/          # The full-page workspace (opens in its own tab)
│   └── welcome/            # The first-run onboarding page
├── scripts/
│   ├── build.mjs           # Packages the extension into dist/*.zip for the stores
│   └── make-store-assets.mjs  # Regenerates the promo/screenshot images
├── store/                 # Store listing copy + promo images
├── TESTING.md             # Manual QA test plan
└── LICENSE                # MIT
```

---

## Understanding `manifest.json`

JSON files can't have comments, so here's what each part means:

- **`manifest_version: 3`** — uses the modern extension format (required by Chrome).
- **`name` / `version` / `description`** — shown on the extensions page and in stores.
- **`permissions`** — what the extension may do. We keep this minimal:
  - `storage` / `unlimitedStorage` — save cards, collections, and screenshots locally.
  - `contextMenus` — add the right-click "Save to Quick Capture" item.
  - `activeTab` — read the current tab's title/URL/selection and take a screenshot **only when you invoke** the extension.
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

## Packaging for the stores

Build a store-ready zip (no extra tools needed — just Node):

```
node scripts/build.mjs
```

This creates `dist/quick-capture-v<version>.zip` containing only the files the
extension needs. Upload that to the Chrome Web Store or Firefox Add-ons.
Listing copy and promo images live in `store/` (see `store/listing.md`).

---

## Testing

See **[TESTING.md](TESTING.md)** for a full manual QA plan with step-by-step
scenarios and a quick regression checklist.

## Security

See **[SECURITY.md](SECURITY.md)** for the security posture: minimal
permissions, no network access, a strict Content Security Policy, and how
untrusted import files are sanitised. Everything stays on your device.

---

## Notes

- **Blocked pages:** browser system pages (`chrome://…`), the extension
  gallery, and some PDF viewers don't allow extensions to read them, so
  capturing (and screenshots) are disabled there. Any normal website works fine.
- **Where's my data?** In the browser's built-in `storage.local`. It stays on
  your computer and survives restarts. Removing the extension removes the data.
- **Storage size:** screenshots make cards bigger. The `unlimitedStorage`
  permission means you won't hit the small default quota; you can still turn
  screenshots off with the **📷 Shot** toggle in the popup.
