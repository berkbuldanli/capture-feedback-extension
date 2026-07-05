// welcome.js
// ------------------------------------------------------------------
// Behaviour for the first-run welcome page: open the dashboard, and
// optionally load a few sample cards so new users have something to
// explore immediately.
// ------------------------------------------------------------------

import { addCard, addCollection, getCards } from "../lib/storage.js";
import { initTheme } from "../lib/theme.js";

initTheme(); // apply the saved light/dark/system preference

const openDashboardBtn = document.getElementById("open-dashboard");
const loadSamplesBtn = document.getElementById("load-samples");
const samplesNote = document.getElementById("samples-note");
const toastEl = document.getElementById("toast");

openDashboardBtn.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") });
});

loadSamplesBtn.addEventListener("click", loadSamples);

/**
 * Seed a small, realistic set of cards + a collection so the dashboard
 * isn't empty on first look. Safe to skip if the user already has cards.
 */
async function loadSamples() {
  loadSamplesBtn.disabled = true;
  try {
    const existing = await getCards();
    if (existing.length > 0) {
      toast("You already have cards — skipped samples");
      return;
    }

    const research = await addCollection("Q3 Research");

    const samples = [
      {
        title: "Notion — Pricing",
        url: "https://www.notion.so/pricing",
        text: "Plus plan is $10 per seat / month billed annually.",
        note: "Undercuts our Team tier by $4 — worth a pricing review.",
        tags: ["competitor", "pricing"],
        collectionId: research?.id || null,
      },
      {
        title: "r/ProductManagement — sync complaints",
        url: "https://www.reddit.com/r/productmanagement",
        text: "\"Honestly I'd pay double if it just synced reliably across devices.\"",
        note: "",
        tags: ["user-quote"],
        collectionId: research?.id || null,
      },
      {
        title: "Linear Changelog",
        url: "https://linear.app/changelog",
        text: "",
        note: "They shipped sub-issues before us — revisit the roadmap.",
        tags: ["competitor", "roadmap"],
        collectionId: null,
      },
      {
        title: "Support ticket #4821",
        url: "https://help.example.com/t/4821",
        text: "Export to CSV keeps timing out on large boards.",
        note: "Third report this month — recurring bug theme.",
        tags: ["bug"],
        collectionId: null,
      },
    ];

    // addCard puts newest first, so add in reverse to keep a natural order.
    for (const s of samples.reverse()) await addCard(s);

    samplesNote.textContent = "✓ Added 4 sample cards and a “Q3 Research” collection. Open the dashboard to explore!";
    samplesNote.hidden = false;
    toast("Sample cards added");
  } catch (err) {
    console.error("Quick Capture: could not load samples.", err);
    toast("Couldn't add samples");
  } finally {
    loadSamplesBtn.disabled = false;
  }
}

let toastTimer = null;
function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 2000);
}
