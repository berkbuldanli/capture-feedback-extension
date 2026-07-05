# Store listing copy

Ready-to-paste text for the Chrome Web Store and Firefox Add-ons listings.

---

## Name
Quick Capture — save pages as tagged cards

## Summary (short, ≤132 chars)
Save any page as a tagged card with notes, screenshots & collections. Search, organise & export — 100% local, no account.

## Category
Productivity

---

## Detailed description

**Quick Capture is a lightweight research notebook for your browser.**
Built for product managers, researchers, and anyone who gathers information
across the web, it turns any page into a searchable, taggable card — in one
click.

**Capture in three ways**
• Click the toolbar icon and hit Save
• Highlight text → right-click → “Save to Quick Capture” (the quote is saved too)
• Press Alt+Shift+S on any page for an instant save

**Every card keeps what matters**
• The page title, URL, and date
• Any text you highlighted
• Your own note
• An optional screenshot of the page
• Tags and a collection

**Stay organised**
• Full-text search across everything
• Filter by tag or collection, and sort by date or title
• Pin the important cards to the top
• A full-page dashboard with a tag/collection sidebar and live stats
• Bulk-manage many cards at once: tag, move, copy, export, or delete together

**Take your data anywhere**
• Copy any card as clean Markdown for Notion, Google Docs, or Slack
• Export everything to a JSON file and import it back on another device

**Private by design**
Everything is stored locally in your browser. There are no accounts, no
servers, and nothing is ever sent anywhere. Works on Chrome and Firefox.

---

## Permission justifications (for reviewers)

- **storage / unlimitedStorage** — save your cards, collections, and settings
  (including optional screenshots) locally on your device.
- **contextMenus** — add the “Save to Quick Capture” right-click item.
- **activeTab** — read the current tab's title, URL, and highlighted text, and
  take a screenshot — only when you invoke the extension (click, shortcut, or
  menu). No background access to your browsing.
- **scripting** — read the highlighted selection from the current page at the
  moment you save it.

No host permissions are requested, so the extension has no standing access to
any website.

---

## Assets in this folder
- `promo-small.png` — 440×280 promo tile
- `screenshot-dashboard.png` — 1280×800 store screenshot
- `promo.html` — source for the promo tile
- (Regenerate images with `node scripts/make-store-assets.mjs`.)
