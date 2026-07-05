// popup.js
// ------------------------------------------------------------------
// Runs when the popup window opens. It wires up the buttons, reads
// and displays saved cards, and handles searching, filtering,
// saving, and deleting.
// ------------------------------------------------------------------

import { getCards, addCard, deleteCard, cleanTags } from "../lib/storage.js";

// Grab the page elements we'll work with, once, up front.
const tagsInput = document.getElementById("tags-input");
const saveBtn = document.getElementById("save-btn");
const searchInput = document.getElementById("search");
const tagFilter = document.getElementById("tag-filter");
const cardsList = document.getElementById("cards");
const emptyMsg = document.getElementById("empty");

// A copy of all cards kept in memory so searching/filtering is instant
// (we only re-read storage after we add or delete something).
let allCards = [];

// ------------------------------------------------------------------
// Startup: load cards and set up event listeners.
// ------------------------------------------------------------------
init();

async function init() {
  allCards = await getCards();
  refreshTagFilter();
  render();

  saveBtn.addEventListener("click", onSave);
  searchInput.addEventListener("input", render);
  tagFilter.addEventListener("change", render);

  // Pressing Enter in the tags box also saves — a small convenience.
  tagsInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onSave();
  });
}

// ------------------------------------------------------------------
// SAVE: capture the current page as a new card.
// ------------------------------------------------------------------
async function onSave() {
  saveBtn.disabled = true;
  try {
    const tab = await getActiveTab();
    if (!tab) return;

    // Try to read any text the user highlighted on the page.
    const selectedText = await getSelectionText(tab.id);

    // Turn the "a, b, c" text box into a clean list of tags.
    const tags = cleanTags(tagsInput.value.split(","));

    const card = await addCard({
      title: tab.title,
      url: tab.url,
      text: selectedText,
      tags,
    });

    // Update our in-memory list and the screen.
    allCards.unshift(card);
    tagsInput.value = "";
    refreshTagFilter();
    render();
  } catch (err) {
    console.error("Quick Capture: could not save this page.", err);
    alert("Sorry — this page can't be captured (some browser pages are blocked).");
  } finally {
    saveBtn.disabled = false;
  }
}

/**
 * Find the tab the user is currently looking at.
 */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Ask the current page for any highlighted text.
 * We run a tiny function inside the page using the `scripting` API.
 * Returns "" if nothing is selected or the page is protected.
 */
async function getSelectionText(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      // This function runs INSIDE the web page, not in the popup.
      func: () => window.getSelection().toString(),
    });
    return results?.[0]?.result || "";
  } catch {
    // Some pages (chrome://, the Web Store, PDFs) block script injection.
    return "";
  }
}

// ------------------------------------------------------------------
// DELETE: remove one card (handled by listening on the whole list).
// ------------------------------------------------------------------
cardsList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  const id = btn.dataset.id;
  await deleteCard(id);
  allCards = allCards.filter((c) => c.id !== id);
  refreshTagFilter();
  render();
});

// ------------------------------------------------------------------
// RENDER: draw the cards that match the search box + tag filter.
// ------------------------------------------------------------------
function render() {
  const query = searchInput.value.trim().toLowerCase();
  const activeTag = tagFilter.value;

  const visible = allCards.filter((card) => {
    // Tag filter: card must contain the selected tag (if one is chosen).
    if (activeTag && !card.tags.includes(activeTag)) return false;

    // Search: match against title, url, text, and tags.
    if (query) {
      const haystack = [
        card.title,
        card.url,
        card.text,
        card.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  // Clear the list, then rebuild it.
  cardsList.replaceChildren();

  // Show a friendly message when there's nothing to display.
  emptyMsg.hidden = visible.length > 0;
  if (visible.length === 0) {
    emptyMsg.textContent =
      allCards.length === 0
        ? "No cards yet. Save this page to get started!"
        : "No cards match your search.";
    return;
  }

  for (const card of visible) {
    cardsList.appendChild(buildCardElement(card));
  }
}

/**
 * Build the HTML for a single card using safe DOM methods.
 * We use textContent (not innerHTML) so page titles/quotes can never
 * inject unwanted markup.
 */
function buildCardElement(card) {
  const li = document.createElement("li");
  li.className = "card";

  // Title (links to the original page).
  const title = document.createElement("p");
  title.className = "card-title";
  const link = document.createElement("a");
  link.href = card.url;
  link.target = "_blank";       // open in a new tab
  link.rel = "noopener";
  link.textContent = card.title;
  title.appendChild(link);
  li.appendChild(title);

  // Meta line: date + shortened URL.
  const meta = document.createElement("p");
  meta.className = "card-meta";
  meta.textContent = `${formatDate(card.createdAt)} · ${shortUrl(card.url)}`;
  li.appendChild(meta);

  // Selected text (only if there is any).
  if (card.text) {
    const text = document.createElement("p");
    text.className = "card-text";
    text.textContent = card.text;
    li.appendChild(text);
  }

  // Tag chips (only if there are any).
  if (card.tags.length) {
    const tags = document.createElement("div");
    tags.className = "tags";
    for (const t of card.tags) {
      const chip = document.createElement("span");
      chip.className = "tag";
      chip.textContent = t;
      tags.appendChild(chip);
    }
    li.appendChild(tags);
  }

  // Delete button.
  const actions = document.createElement("div");
  actions.className = "card-actions";
  const del = document.createElement("button");
  del.className = "delete-btn";
  del.type = "button";
  del.dataset.id = card.id; // remember which card this deletes
  del.textContent = "Delete";
  actions.appendChild(del);
  li.appendChild(actions);

  return li;
}

// ------------------------------------------------------------------
// Rebuild the tag dropdown from the tags that actually exist.
// ------------------------------------------------------------------
function refreshTagFilter() {
  const previous = tagFilter.value; // keep the user's current choice if possible

  const allTags = new Set();
  for (const card of allCards) {
    for (const t of card.tags) allTags.add(t);
  }
  const sorted = [...allTags].sort();

  tagFilter.replaceChildren();
  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All tags";
  tagFilter.appendChild(allOption);

  for (const t of sorted) {
    const opt = document.createElement("option");
    opt.value = t;
    opt.textContent = t;
    tagFilter.appendChild(opt);
  }

  // Restore the previous selection if that tag still exists.
  tagFilter.value = sorted.includes(previous) ? previous : "";
}

// ------------------------------------------------------------------
// Small formatting helpers.
// ------------------------------------------------------------------

/** Turn a millisecond timestamp into a short, readable date/time. */
function formatDate(ms) {
  const d = new Date(ms);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Show just the site's domain instead of the whole long URL. */
function shortUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
