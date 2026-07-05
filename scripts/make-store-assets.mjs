// make-store-assets.mjs
// ------------------------------------------------------------------
// Regenerates the store images in store/:
//   - promo-small.png          (440x280 promo tile, from store/promo.html)
//   - screenshot-dashboard.png (1280x800 dashboard screenshot with demo data)
//
// This is a DEVELOPER tool, not part of the shipped extension. It uses
// Playwright to drive a real Chromium. To run it:
//
//   npm install -D playwright
//   npx playwright install chromium
//   node scripts/make-store-assets.mjs
//
// (If your environment already provides a Chromium binary, set
//  CHROMIUM_PATH to it to skip the download.)
// ------------------------------------------------------------------

import { chromium } from "playwright";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STORE = path.join(ROOT, "store");
const launchOpts = { headless: true, args: ["--no-sandbox"] };
if (process.env.CHROMIUM_PATH) launchOpts.executablePath = process.env.CHROMIUM_PATH;

// 1) Promo tile (exactly 440x280) from the static promo.html.
{
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 440, height: 280 } });
  await page.goto("file://" + path.join(STORE, "promo.html"));
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(STORE, "promo-small.png"),
    clip: { x: 0, y: 0, width: 440, height: 280 },
  });
  await browser.close();
  console.log("wrote store/promo-small.png");
}

// 2) Store screenshot (1280x800): the dashboard loaded with demo data.
{
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "qc-store-"));
  const ctx = await chromium.launchPersistentContext(userDir, {
    ...launchOpts,
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, "--no-sandbox"],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 10000 });
  const extId = new URL(sw.url()).host;

  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${extId}/src/dashboard/dashboard.html`);
  const now = Date.now();
  await page.evaluate((now) => {
    const coll = { id: "c1", name: "Q3 Research", color: "hsl(210,60%,45%)", createdAt: now };
    const cards = [
      { id: "1", title: "Notion — Pricing", url: "https://www.notion.so/pricing", text: "Plus plan is $10 per seat / month billed annually.", note: "Undercuts our Team tier by $4", tags: ["competitor", "pricing"], collectionId: "c1", thumb: "", pinned: true, createdAt: now - 3600e3 },
      { id: "2", title: "r/ProductManagement — sync", url: "https://www.reddit.com/r/productmanagement", text: "\"I'd pay double if it just synced across devices.\"", note: "", tags: ["user-quote"], collectionId: "c1", thumb: "", pinned: false, createdAt: now - 86400e3 },
      { id: "3", title: "Linear Changelog", url: "https://linear.app/changelog", text: "", note: "Shipped sub-issues before us — revisit roadmap", tags: ["competitor", "roadmap"], collectionId: null, thumb: "", pinned: false, createdAt: now - 2 * 86400e3 },
      { id: "4", title: "Figma pricing update", url: "https://figma.com/pricing", text: "New dev seat at $25/mo.", note: "", tags: ["competitor", "pricing"], collectionId: null, thumb: "", pinned: false, createdAt: now - 3 * 86400e3 },
      { id: "5", title: "Support ticket #4821", url: "https://help.example.com/t/4821", text: "Export to CSV keeps timing out on large boards.", note: "recurring bug theme", tags: ["bug"], collectionId: null, thumb: "", pinned: false, createdAt: now - 4 * 86400e3 },
      { id: "6", title: "Onboarding survey results", url: "https://docs.google.com/spreadsheets", text: "", note: "40% drop off at step 3", tags: ["research"], collectionId: null, thumb: "", pinned: false, createdAt: now - 5 * 86400e3 },
    ];
    return chrome.storage.local.set({ cards, collections: [coll] });
  }, now);
  await page.reload();
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(STORE, "screenshot-dashboard.png"),
    clip: { x: 0, y: 0, width: 1280, height: 800 },
  });
  await ctx.close();
  fs.rmSync(userDir, { recursive: true, force: true });
  console.log("wrote store/screenshot-dashboard.png");
}

console.log("Done.");
