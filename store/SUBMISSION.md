# Store Submission Checklist — Quick Capture

A step-by-step guide to publish Quick Capture to the **Chrome Web Store** and
**Firefox Add-ons (AMO)**. Copy/paste text is provided; tick each box as you go.

> All the listing text lives in `store/listing.md`. Images live in `store/`.

---

## Part A — Before you upload (do this once)

- [ ] **Run the tests / smoke test.** Load the unpacked extension and walk the
      quick regression checklist in `TESTING.md`. Especially confirm a real
      screenshot is captured (scenario 2.6) — that's the one thing automation
      can't fully prove.
- [ ] **Build the package:** `node scripts/build.mjs`
      → produces `dist/quick-capture-v2.0.0.zip` (this is what you upload).
- [ ] **Host the privacy policy** so you have a public URL. Easiest options:
  - GitHub file URL: `https://github.com/berkbuldanli/capture-feedback-extension/blob/main/PRIVACY.md`, or
  - Enable **GitHub Pages** on the repo and link `PRIVACY.md`.
  - You'll paste this URL into both stores.
- [ ] **Decide a support contact** (an email you'll monitor). Both stores show/ask for one.
- [ ] **Have the images ready** (already generated in `store/`):
  - `promo-small.png` (440×280 promo tile — Chrome, optional)
  - `screenshot-1-capture.png` … `screenshot-4-dark.png` (1280×800 — 1 to 5 allowed)
  - `icons/icon-128.png` (store icon — 128×128)

---

## Part B — Chrome Web Store

### B1. One-time account setup
- [ ] Go to the **Chrome Web Store Developer Dashboard**:
      `https://chrome.google.com/webstore/devconsole`
- [ ] Register as a developer and pay the **one-time US$5 fee** (per account).
- [ ] Set up the developer account's contact email and **verify** it.

### B2. Create the item
- [ ] Click **"Add new item"** → upload `dist/quick-capture-v2.0.0.zip`.
- [ ] Wait for it to process (it reads your `manifest.json`).

### B3. Store listing tab — paste this
- [ ] **Name:** `Quick Capture` (or `Quick Capture — save pages as tagged cards`)
- [ ] **Summary (≤132 chars):**
      `Save any page as a tagged card with notes, screenshots & collections. Search, organise & export — 100% local, no account.`
- [ ] **Description:** paste the "Detailed description" block from `store/listing.md`.
- [ ] **Category:** `Productivity`
- [ ] **Language:** English
- [ ] **Icon:** upload `icons/icon-128.png` (usually taken from the package automatically).
- [ ] **Screenshots:** upload the four `store/screenshot-*.png` (1280×800).
- [ ] **Small promo tile (optional but recommended):** upload `store/promo-small.png`.

### B4. Privacy tab — this is where most first submissions get rejected, so be exact
- [ ] **Single purpose** — paste:
      `Quick Capture lets the user save the current web page (its title, URL, selected text, and an optional screenshot) as a locally-stored, taggable note card, and browse/search those cards.`
- [ ] **Permission justifications** — paste each:
  - **activeTab:** `Used only when the user invokes the extension (toolbar click, keyboard shortcut, or context menu) to read the current tab's title, URL, and selected text, and to capture a screenshot of that tab. No access to other tabs or background browsing.`
  - **scripting:** `Used to read the user's highlighted text from the current page at the moment they choose to save it. It runs a single, isolated read of window.getSelection().`
  - **contextMenus:** `Adds a "Save to Quick Capture" item to the right-click menu when text is selected.`
  - **storage / unlimitedStorage:** `Stores the user's saved cards, collections, settings, and optional screenshots locally on the device. unlimitedStorage avoids the small default quota because screenshots can be large. No data is transmitted anywhere.`
  - **host permissions:** `None requested.`
- [ ] **Data usage disclosures** (the "Privacy practices" form). Answer truthfully:
  - Does it collect user data? → **The extension does NOT transmit or sell any data.** It stores data locally only.
  - Check the certifications:
    - [ ] "I do not sell or transfer user data to third parties, outside of the approved use cases"
    - [ ] "I do not use or transfer user data for purposes unrelated to my item's single purpose"
    - [ ] "I do not use or transfer user data to determine creditworthiness or for lending"
  - **Privacy policy URL:** paste your hosted `PRIVACY.md` URL (required).

### B5. Distribution
- [ ] **Visibility:** Public (or Unlisted if you want to soft-launch to a link first).
- [ ] **Regions:** All (or pick).
- [ ] Save the draft, then click **"Submit for review."**

### B6. After submitting
- [ ] Review typically takes **a few hours to a few days**. You'll get an email.
- [ ] If rejected, the email names the reason (usually a permission
      justification or privacy field) — fix and resubmit.

---

## Part C — Firefox Add-ons (AMO)

> One manifest works for both, but note the Firefox add-on id below.

### C1. Set the add-on id
- [ ] In `manifest.json`, `browser_specific_settings.gecko.id` is currently the
      placeholder `quick-capture@berkbuldanli.example`. Change it to an id you
      control, e.g. `quick-capture@yourdomain.com` (it just needs to be unique
      and look like an email or UUID). Rebuild: `node scripts/build.mjs`.

### C2. Submit
- [ ] Go to `https://addons.mozilla.org/developers/` and sign in with a Firefox account (free — no fee).
- [ ] **Submit a New Add-on** → **On this site** (listed) → upload the zip.
- [ ] Choose distribution: **listed on AMO**.
- [ ] AMO validates the package automatically; fix any flagged warnings.

### C3. Listing
- [ ] **Name / Summary / Description:** reuse the text from `store/listing.md`.
- [ ] **Categories:** Productivity / Bookmarks.
- [ ] **Screenshots:** upload the same `store/screenshot-*.png`.
- [ ] **Privacy policy:** paste your hosted URL.
- [ ] **License:** MIT (matches `LICENSE`).
- [ ] Submit. Firefox review is often fast for small, source-readable add-ons.

---

## Part D — Go-live checklist (final gate)

- [ ] Version in `manifest.json` is correct (`2.0.0`) and higher than any prior upload
- [ ] `dist/quick-capture-v2.0.0.zip` built from a clean tree (no test/dev files — verified: 18 files)
- [ ] Loads with **zero errors/warnings** on `chrome://extensions` and Firefox `about:debugging`
- [ ] Screenshot capture works on a normal page (📷)
- [ ] Import of a normal export works; a malicious import is neutralised (TESTING §8b)
- [ ] Privacy policy URL is live and reachable
- [ ] Permission justifications + data disclosures filled in (Chrome)
- [ ] Firefox add-on id changed from the placeholder
- [ ] Support email set and monitored

---

## Notes & gotchas

- **Screenshots must be exactly 1280×800 or 640×400**, PNG/JPEG. Ours are 1280×800.
- **You cannot change the extension's single purpose later** without re-review.
- **Every new release** = bump `version` in `manifest.json`, rebuild, upload the new zip.
- Keep the uploaded `.zip` and a matching git tag for each release so you can reproduce it.
- The store review reads your actual code — it's readable and unminified, which
  *helps* reviewers approve faster.
