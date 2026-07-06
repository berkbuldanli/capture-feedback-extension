# Security

This document explains Quick Capture's security posture and how to report an
issue. It's written to be understandable even if you're new to this.

## The short version

- **Nothing leaves your browser.** No accounts, no servers, no analytics, no
  network requests to any third party. All data lives in the browser's local
  storage on your device.
- **Minimal permissions.** No access to any website in the background — the
  extension can only read the current tab (title, URL, selected text, and take
  a screenshot) *at the moment you invoke it* (click, shortcut, or menu).
- **No remote code.** The extension only runs code shipped inside it. A strict
  Content Security Policy blocks inline scripts, `eval`, and remote scripts.

## Permissions, and why each is needed

| Permission | Why | Scope |
|---|---|---|
| `storage` / `unlimitedStorage` | Save your cards, collections, settings, and screenshots locally | Your device only |
| `activeTab` | Read the current tab's title/URL/selection and screenshot it | Only the tab you're on, only when you invoke the extension |
| `scripting` | Read the highlighted text from the page when you save | Runs a one-line read of the selection, in an isolated world |
| `contextMenus` | Add the right-click "Save to Quick Capture" item | — |

There are **no host permissions** (`<all_urls>` etc.), so the extension has no
standing access to your browsing.

## How untrusted input is handled

The one place external, untrusted data enters the app is **Import** — you can
load a `.json` file, and a shared file could be crafted maliciously. Quick
Capture defends against this in two layers:

1. **On import** (`src/lib/storage.js` → `sanitizeCard`): every field is
   validated. URLs are restricted to `http(s)` (so a `javascript:` or `data:`
   URL is dropped), thumbnails must be real `data:image/...` values, and
   collection colours must be simple CSS colours (so a colour can't smuggle in
   a `url(...)` tracking beacon).
2. **On render** (popup + dashboard): all page-derived text (titles, quotes,
   notes, tags) is inserted with `textContent`, never `innerHTML`, so it can
   never become live HTML. Links are re-checked with `safeUrl()` and, if a URL
   isn't a safe web link, the title is shown as plain non-clickable text.
   External links use `rel="noopener noreferrer"`.

These behaviours are covered by automated tests (see the security suite): a
crafted import with `javascript:` links, `<script>`/`<img onerror>` payloads,
an HTML "thumbnail", and a tracking-URL colour is imported and verified to
produce **no script execution, no network beacon, and no clickable dangerous
links**.

## What Quick Capture intentionally does NOT do

- It does not sync or upload anything.
- It does not inject content scripts into pages you visit.
- It does not request access to your browsing history or all sites.

## A note on screenshots

If you enable the 📷 screenshot option, each card stores an image of the page
you captured. That image may contain whatever was on screen (including private
content). It's stored locally like everything else, but keep it in mind before
exporting/sharing a JSON file. You can turn screenshots off any time with the
📷 toggle in the popup.

## Reporting a vulnerability

If you find a security issue, please open a private report to the maintainer
rather than a public issue. Include steps to reproduce and the impact. We'll
confirm and address valid reports promptly.
