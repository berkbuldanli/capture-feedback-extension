// make-store-assets.mjs
// ------------------------------------------------------------------
// Regenerates the store images in store/:
//   - promo-small.png            (440x280 promo tile, from store/promo.html)
//   - screenshot-1-capture.png   (1280x800 marketing slide: the popup)
//   - screenshot-2-dashboard.png (1280x800 dashboard, light)
//   - screenshot-3-organise.png  (1280x800 dashboard, collection filter + bulk)
//   - screenshot-4-dark.png      (1280x800 dashboard, dark)
//
// DEVELOPER tool, not part of the shipped extension. It uses Playwright
// to drive a real Chromium:
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

const now = Date.now();
const THUMB =
  "data:image/svg+xml;base64," +
  Buffer.from(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='240'><rect width='400' height='240' fill='#dbeafe'/><rect width='400' height='40' fill='#2563eb'/><rect x='20' y='70' width='260' height='16' rx='4' fill='#93c5fd'/><rect x='20' y='100' width='320' height='12' rx='4' fill='#bfdbfe'/><rect x='20' y='122' width='300' height='12' rx='4' fill='#bfdbfe'/></svg>`
  ).toString("base64");

// Demo data seeded into storage for the dashboard/popup screenshots.
function seedInto(arg) {
  const collections = [
    { id: "c1", name: "Q3 Research", color: "hsl(210,60%,45%)", createdAt: arg.now },
    { id: "c2", name: "Bugs", color: "hsl(10,60%,45%)", createdAt: arg.now },
  ];
  const cards = [
    { id: "1", title: "Notion — Pricing", url: "https://www.notion.so/pricing", text: "Plus plan is $10 per seat / month billed annually.", note: "Undercuts our Team tier by $4", tags: ["competitor", "pricing"], collectionId: "c1", thumb: arg.thumb, pinned: true, createdAt: arg.now - 3600e3 },
    { id: "2", title: "r/ProductManagement — sync", url: "https://www.reddit.com/r/productmanagement", text: "\"I'd pay double if it just synced across devices.\"", note: "", tags: ["user-quote"], collectionId: "c1", thumb: "", pinned: false, createdAt: arg.now - 86400e3 },
    { id: "3", title: "Linear Changelog", url: "https://linear.app/changelog", text: "", note: "Shipped sub-issues before us — revisit roadmap", tags: ["competitor", "roadmap"], collectionId: null, thumb: "", pinned: false, createdAt: arg.now - 2 * 86400e3 },
    { id: "4", title: "Figma pricing update", url: "https://figma.com/pricing", text: "New dev seat at $25/mo.", note: "", tags: ["competitor", "pricing"], collectionId: "c1", thumb: arg.thumb, pinned: false, createdAt: arg.now - 3 * 86400e3 },
    { id: "5", title: "Support ticket #4821", url: "https://help.example.com/t/4821", text: "Export to CSV keeps timing out on large boards.", note: "recurring bug theme", tags: ["bug"], collectionId: "c2", thumb: "", pinned: false, createdAt: arg.now - 4 * 86400e3 },
    { id: "6", title: "Onboarding survey results", url: "https://docs.google.com/spreadsheets", text: "", note: "40% drop off at step 3", tags: ["research"], collectionId: null, thumb: "", pinned: false, createdAt: arg.now - 5 * 86400e3 },
  ];
  return chrome.storage.local.set({ cards, collections, settings: { captureScreenshots: true, theme: arg.theme } });
}

/** Open the extension with demo data seeded and the dashboard showing. */
async function withDashboard(theme, fn) {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), "qc-ss-"));
  const ctx = await chromium.launchPersistentContext(userDir, {
    ...launchOpts,
    colorScheme: "light",
    viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${ROOT}`, `--load-extension=${ROOT}`, "--no-sandbox"],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 10000 });
  const extId = new URL(sw.url()).host;
  const page = await ctx.newPage();
  await page.goto(`chrome-extension://${extId}/src/dashboard/dashboard.html`);
  await page.evaluate(seedInto, { now, thumb: THUMB, theme });
  await page.reload();
  await page.waitForTimeout(500);
  await fn(page, extId, ctx);
  await ctx.close();
  fs.rmSync(userDir, { recursive: true, force: true });
}

/** Compose a UI screenshot onto a branded 1280x800 marketing slide. */
async function slide(rawPng, out, title, subtitle) {
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const dataUrl = "data:image/png;base64," + fs.readFileSync(rawPng).toString("base64");
  await page.setContent(`<!doctype html><html><head><meta charset=utf8><style>
    *{margin:0;box-sizing:border-box}html,body{width:1280px;height:800px}
    body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#eff6ff,#dbeafe);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 60px;overflow:hidden}
    h1{color:#1e3a8a;font-size:40px;letter-spacing:-.5px;text-align:center}
    p{color:#2563eb;font-size:20px;margin-top:10px;text-align:center}
    img{margin-top:32px;max-width:1080px;max-height:520px;border-radius:16px;box-shadow:0 30px 80px rgba(0,0,0,.28);border:1px solid rgba(0,0,0,.08)}
    </style></head><body><h1>${title}</h1><p>${subtitle}</p><img src="${dataUrl}"></body></html>`);
  await page.waitForTimeout(200);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1280, height: 800 } });
  await browser.close();
  console.log("wrote", path.relative(ROOT, out));
}

// --- Promo tile (exactly 440x280) from the static promo.html. ---
{
  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage({ viewport: { width: 440, height: 280 } });
  await page.goto("file://" + path.join(STORE, "promo.html"));
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(STORE, "promo-small.png"), clip: { x: 0, y: 0, width: 440, height: 280 } });
  await browser.close();
  console.log("wrote store/promo-small.png");
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qc-raw-"));

// --- Screenshot 1: the popup, on a marketing slide. ---
await withDashboard("system", async (page, extId, ctx) => {
  const pop = await ctx.newPage({ viewport: { width: 380, height: 720 } });
  await pop.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await pop.waitForTimeout(400);
  await pop.setViewportSize({ width: 380, height: await pop.evaluate(() => document.body.scrollHeight) });
  await pop.screenshot({ path: path.join(tmp, "popup.png") });
  await pop.close();
});
await slide(path.join(tmp, "popup.png"), path.join(STORE, "screenshot-1-capture.png"),
  "Capture anything in one click", "Save the page, your highlight, tags, a note — and a screenshot.");

// --- Screenshot 2: dashboard (light). ---
await withDashboard("system", async (page) => {
  await page.screenshot({ path: path.join(STORE, "screenshot-2-dashboard.png"), clip: { x: 0, y: 0, width: 1280, height: 800 } });
  console.log("wrote store/screenshot-2-dashboard.png");
});

// --- Screenshot 3: collection filter + bulk selection. ---
await withDashboard("system", async (page) => {
  await page.locator('.filter[data-filter="collection"]').first().click();
  await page.locator("#select-all").check();
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(STORE, "screenshot-3-organise.png"), clip: { x: 0, y: 0, width: 1280, height: 800 } });
  console.log("wrote store/screenshot-3-organise.png");
});

// --- Screenshot 4: dashboard (dark). ---
await withDashboard("dark", async (page) => {
  await page.screenshot({ path: path.join(STORE, "screenshot-4-dark.png"), clip: { x: 0, y: 0, width: 1280, height: 800 } });
  console.log("wrote store/screenshot-4-dark.png");
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log("Done.");
