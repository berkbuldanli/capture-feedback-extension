// popup.js
// ------------------------------------------------------------------
// Runs when the popup opens. It wires up every button and draws the
// list of saved cards, with searching, filtering, sorting, editing,
// pinning, copying, deleting, and export/import.
// ------------------------------------------------------------------

import {
  getCards,
  addCard,
  updateCard,
  togglePin,
  deleteCard,
  cleanTags,
  exportCardsJSON,
  importCardsJSON,
} from "../lib/storage.js";
import {
  formatDate,
  shortUrl,
  avatarColor,
  avatarLetter,
  markdownForCard,
} from "../lib/format.js";

// Grab the elements we'll use, once, up front.
const tagsInput = document.getElementById("tags-input");
const noteInput = document.getElementById("note-input");
const saveBtn = document.getElementById("save-btn");
const searchInput = document.getElementById("search");
const tagFilter = document.getElementById("tag-filter");
const sortSelect = document.getElementById("sort");
const cardsList = document.getElementById("cards");
const emptyState = document.getElementById("empty");
const noResults = document.getElementById("no-results");
const countBadge = document.getElementById("count");
const dashboardBtn = document.getElementById("dashboard-btn");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");
const toastEl = document.getElementById("toast");

// State kept in memory so searching/filtering feels instant.
let allCards = [];
// The id of the card currently being edited (or null if none).
let editingId = null;

init();

async function init() {
  allCards = await getCards();
  refreshTagFilter();
  render();

  saveBtn.addEventListener("click", onSave);
  searchInput.addEventListener("input", render);
  tagFilter.addEventListener("change", render);
  sortSelect.addEventListener("change", render);

  // Pressing Enter in either save field saves.
  tagsInput.addEventListener("keydown", (e) => e.key === "Enter" && onSave());
  noteInput.addEventListener("keydown", (e) => e.key === "Enter" && onSave());

  exportBtn.addEventListener("click", onExport);
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", onImport);

  // Open the roomy full-page dashboard in a new browser tab.
  dashboardBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("src/dashboard/dashboard.html") });
    window.close(); // close the little popup once the dashboard opens
  });
}

// ------------------------------------------------------------------
// SAVE the current page as a new card.
// ------------------------------------------------------------------
async function onSave() {
  saveBtn.disabled = true;
  try {
    const tab = await getActiveTab();
    if (!tab) return;

    const card = await addCard({
      title: tab.title,
      url: tab.url,
      text: await getSelectionText(tab.id),
      note: noteInput.value,
      tags: cleanTags(tagsInput.value.split(",")),
    });

    allCards.unshift(card);
    tagsInput.value = "";
    noteInput.value = "";
    refreshTagFilter();
    render();
    toast("Saved ✓");
  } catch (err) {
    console.error("Quick Capture: could not save this page.", err);
    toast("Can't capture this page");
  } finally {
    saveBtn.disabled = false;
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Ask the current page for any highlighted text. Returns "" if nothing
 * is selected or the page blocks scripts (chrome://, PDFs, etc.).
 */
async function getSelectionText(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.getSelection().toString(),
    });
    return results?.[0]?.result || "";
  } catch {
    return "";
  }
}

// ------------------------------------------------------------------
// One click listener for the whole card list. We look at which button
// was clicked (via its data-action) and act accordingly. This is
// simpler than attaching a listener to every button.
// ------------------------------------------------------------------
cardsList.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;

  if (action === "filter-tag") {
    tagFilter.value = btn.dataset.tag;
    render();
    return;
  }
  if (action === "pin") {
    await togglePin(id);
    const c = allCards.find((x) => x.id === id);
    if (c) c.pinned = !c.pinned;
    render();
    return;
  }
  if (action === "copy") {
    const card = allCards.find((x) => x.id === id);
    if (card) await copyAsMarkdown(card);
    return;
  }
  if (action === "delete") {
    await deleteCard(id);
    allCards = allCards.filter((c) => c.id !== id);
    if (editingId === id) editingId = null;
    refreshTagFilter();
    render();
    toast("Deleted");
    return;
  }
  if (action === "edit") {
    editingId = id;
    render();
    return;
  }
  if (action === "cancel-edit") {
    editingId = null;
    render();
    return;
  }
  if (action === "save-edit") {
    const li = btn.closest(".card");
    const note = li.querySelector(".edit-note").value;
    const tags = cleanTags(li.querySelector(".edit-tags").value.split(","));
    const updated = await updateCard(id, { note, tags });
    if (updated) {
      const idx = allCards.findIndex((c) => c.id === id);
      if (idx > -1) allCards[idx] = updated;
    }
    editingId = null;
    refreshTagFilter();
    render();
    toast("Updated ✓");
    return;
  }
});

// ------------------------------------------------------------------
// RENDER the cards that match the search box, tag filter, and sort.
// ------------------------------------------------------------------
function render() {
  updateCount();

  const query = searchInput.value.trim().toLowerCase();
  const activeTag = tagFilter.value;

  let visible = allCards.filter((card) => {
    if (activeTag && !card.tags.includes(activeTag)) return false;
    if (query) {
      const haystack = [card.title, card.url, card.text, card.note, card.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  // Pinned cards always float to the top; then apply the chosen order.
  const newestFirst = sortSelect.value !== "oldest";
  visible = visible.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return newestFirst ? b.createdAt - a.createdAt : a.createdAt - b.createdAt;
  });

  cardsList.replaceChildren();

  // Decide which "nothing here" message (if any) to show.
  emptyState.hidden = allCards.length !== 0;
  noResults.hidden = !(allCards.length > 0 && visible.length === 0);

  for (const card of visible) {
    cardsList.appendChild(buildCardElement(card));
  }
}

/**
 * Build one card — either the normal view or the inline edit form.
 * We use textContent (not innerHTML) for anything that came from a web
 * page so titles/quotes can never inject unwanted markup.
 */
function buildCardElement(card) {
  const li = document.createElement("li");
  li.className = "card" + (card.pinned ? " pinned" : "");

  // --- Head: avatar + title + meta ---
  const head = document.createElement("div");
  head.className = "card-head";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  const domain = shortUrl(card.url);
  avatar.textContent = avatarLetter(card);
  avatar.style.background = avatarColor(domain || card.title);
  head.appendChild(avatar);

  const headings = document.createElement("div");
  headings.className = "card-headings";

  const title = document.createElement("p");
  title.className = "card-title";
  const link = document.createElement("a");
  link.href = card.url || "#";
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = card.title;
  title.appendChild(link);
  headings.appendChild(title);

  const meta = document.createElement("p");
  meta.className = "card-meta";
  meta.textContent = `${formatDate(card.createdAt)} · ${domain}`;
  headings.appendChild(meta);

  head.appendChild(headings);
  li.appendChild(head);

  // If this card is being edited, show the form instead of the details.
  if (editingId === card.id) {
    li.appendChild(buildEditForm(card));
    return li;
  }

  // --- Selected text ---
  if (card.text) {
    const text = document.createElement("p");
    text.className = "card-text";
    text.textContent = card.text;
    li.appendChild(text);
  }

  // --- User note ---
  if (card.note) {
    const note = document.createElement("p");
    note.className = "card-note";
    note.textContent = card.note;
    li.appendChild(note);
  }

  // --- Tag chips (clickable to filter) ---
  if (card.tags.length) {
    const tags = document.createElement("div");
    tags.className = "tags";
    for (const t of card.tags) {
      const chip = document.createElement("button");
      chip.className = "tag";
      chip.type = "button";
      chip.dataset.action = "filter-tag";
      chip.dataset.tag = t;
      chip.textContent = t;
      tags.appendChild(chip);
    }
    li.appendChild(tags);
  }

  // --- Action row ---
  li.appendChild(
    buildActions(card, [
      { action: "pin", label: card.pinned ? "★ Pinned" : "☆ Pin", cls: "star" + (card.pinned ? " on" : "") },
      { action: "copy", label: "⧉ Copy" },
      { action: "edit", label: "✎ Edit" },
      { spacer: true },
      { action: "delete", label: "🗑 Delete", cls: "danger" },
    ])
  );

  return li;
}

/** Build the inline edit form (note + tags). */
function buildEditForm(card) {
  const form = document.createElement("div");
  form.className = "edit-form";

  const note = document.createElement("textarea");
  note.className = "edit-note";
  note.placeholder = "Note";
  note.value = card.note;
  form.appendChild(note);

  const tagsWrap = document.createElement("div");
  tagsWrap.className = "edit-row";
  const tags = document.createElement("input");
  tags.className = "edit-tags";
  tags.type = "text";
  tags.placeholder = "tags, comma separated";
  tags.value = card.tags.join(", ");
  tagsWrap.appendChild(tags);
  form.appendChild(tagsWrap);

  const actions = document.createElement("div");
  actions.className = "edit-actions";
  const save = document.createElement("button");
  save.className = "btn-primary";
  save.type = "button";
  save.dataset.action = "save-edit";
  save.dataset.id = card.id;
  save.textContent = "Save";
  const cancel = document.createElement("button");
  cancel.className = "btn-ghost";
  cancel.type = "button";
  cancel.dataset.action = "cancel-edit";
  cancel.dataset.id = card.id;
  cancel.textContent = "Cancel";
  actions.append(save, cancel);
  form.appendChild(actions);

  return form;
}

/** Build a row of small action buttons from a simple description list. */
function buildActions(card, items) {
  const row = document.createElement("div");
  row.className = "card-actions";
  for (const item of items) {
    const btn = document.createElement("button");
    if (item.spacer) {
      btn.className = "act spacer";
      btn.tabIndex = -1;
      btn.setAttribute("aria-hidden", "true");
    } else {
      btn.className = "act" + (item.cls ? " " + item.cls : "");
      btn.type = "button";
      btn.dataset.action = item.action;
      btn.dataset.id = card.id;
      btn.textContent = item.label;
    }
    row.appendChild(btn);
  }
  return row;
}

// ------------------------------------------------------------------
// Copy a card to the clipboard as Markdown (great for pasting into
// Notion, Google Docs, Slack, etc.).
// ------------------------------------------------------------------
async function copyAsMarkdown(card) {
  try {
    await navigator.clipboard.writeText(markdownForCard(card));
    toast("Copied as Markdown");
  } catch {
    toast("Couldn't copy");
  }
}

// ------------------------------------------------------------------
// Export all cards as a downloadable .json file.
// ------------------------------------------------------------------
async function onExport() {
  if (allCards.length === 0) {
    toast("Nothing to export yet");
    return;
  }
  const json = await exportCardsJSON();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  a.href = url;
  a.download = `quick-capture-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${allCards.length} card${allCards.length === 1 ? "" : "s"}`);
}

// ------------------------------------------------------------------
// Import cards from a .json file the user picks.
// ------------------------------------------------------------------
async function onImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const { added, skipped } = await importCardsJSON(text);
    allCards = await getCards();
    refreshTagFilter();
    render();
    toast(`Imported ${added} · skipped ${skipped}`);
  } catch (err) {
    console.error("Quick Capture: import failed.", err);
    toast("Import failed — is it a valid export?");
  } finally {
    // Reset so picking the same file again still fires "change".
    importFile.value = "";
  }
}

// ------------------------------------------------------------------
// Rebuild the tag dropdown from the tags that actually exist.
// ------------------------------------------------------------------
function refreshTagFilter() {
  const previous = tagFilter.value;

  const allTags = new Set();
  for (const card of allCards) for (const t of card.tags) allTags.add(t);
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

  tagFilter.value = sorted.includes(previous) ? previous : "";
}

function updateCount() {
  countBadge.textContent = String(allCards.length);
}

// ------------------------------------------------------------------
// A small "toast" message that appears briefly at the bottom.
// ------------------------------------------------------------------
let toastTimer = null;
function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 1800);
}
