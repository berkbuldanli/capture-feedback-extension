// dashboard.js
// ------------------------------------------------------------------
// Behaviour for the full-page dashboard. It shares the same storage
// and formatting helpers as the popup, but adds a tag sidebar, stats,
// a multi-column board, and bulk actions (act on many cards at once).
// ------------------------------------------------------------------

import {
  getCards,
  updateCard,
  togglePin,
  deleteCard,
  cleanTags,
  exportCardsJSON,
  importCardsJSON,
  getCollections,
  addCollection,
  renameCollection,
  deleteCollection,
} from "../lib/storage.js";
import {
  formatDateFull,
  shortUrl,
  avatarColor,
  avatarLetter,
  markdownForCard,
  safeUrl,
  isImageDataUrl,
} from "../lib/format.js";
import { initTheme, themeMeta, nextTheme, saveTheme } from "../lib/theme.js";

// Elements.
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const themeBtn = document.getElementById("theme-btn");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const importFile = document.getElementById("import-file");
const filtersEl = document.getElementById("filters");
const statsEl = document.getElementById("stats");
const board = document.getElementById("board");
const emptyState = document.getElementById("empty");
const noResults = document.getElementById("no-results");
const selectAll = document.getElementById("select-all");
const selectionLabel = document.getElementById("selection-label");
const bulkActions = document.getElementById("bulk-actions");
const toastEl = document.getElementById("toast");

// State.
let allCards = [];
let collections = [];
let filter = { type: "all" }; // all | pinned | untagged | tag(+tag) | collection(+id)
let selected = new Set(); // ids of checked cards
let editingId = null;

init();

let currentTheme = "system";

async function init() {
  currentTheme = await initTheme();
  updateThemeButton();

  [allCards, collections] = await Promise.all([getCards(), getCollections()]);
  render();

  themeBtn.addEventListener("click", async () => {
    currentTheme = nextTheme(currentTheme);
    await saveTheme(currentTheme);
    updateThemeButton();
  });
  searchInput.addEventListener("input", render);
  sortSelect.addEventListener("change", render);
  exportBtn.addEventListener("click", () => exportCards(allCards, "all"));
  importBtn.addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", onImport);

  // Sidebar clicks: manage buttons first, then plain filter selection.
  filtersEl.addEventListener("click", onSidebarClick);

  // Select-all checkbox.
  selectAll.addEventListener("change", () => {
    const visible = getVisible();
    if (selectAll.checked) visible.forEach((c) => selected.add(c.id));
    else visible.forEach((c) => selected.delete(c.id));
    render();
  });

  // Bulk action buttons.
  bulkActions.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-bulk]");
    if (btn) onBulk(btn.dataset.bulk);
  });

  // All per-card clicks (delegated).
  board.addEventListener("click", onBoardClick);
  board.addEventListener("change", onBoardChange);
}

// ------------------------------------------------------------------
// Sidebar clicks: create/rename/delete collections, or pick a filter.
// ------------------------------------------------------------------
async function onSidebarClick(e) {
  // 1) Manage buttons (add / rename / delete a collection).
  const manage = e.target.closest("[data-manage]");
  if (manage) {
    const kind = manage.dataset.manage;
    const id = manage.dataset.id;

    if (kind === "add-collection") {
      const name = window.prompt("Name your new collection:");
      if (name && name.trim()) {
        const created = await addCollection(name);
        collections = await getCollections();
        if (created) filter = { type: "collection", id: created.id };
        render();
      }
      return;
    }
    if (kind === "rename") {
      const c = collections.find((x) => x.id === id);
      const name = window.prompt("Rename collection:", c ? c.name : "");
      if (name && name.trim()) {
        await renameCollection(id, name);
        collections = await getCollections();
        render();
      }
      return;
    }
    if (kind === "delete") {
      if (window.confirm("Delete this collection? Its cards are kept (just ungrouped).")) {
        await deleteCollection(id);
        collections = await getCollections();
        allCards = await getCards(); // cards had their collectionId cleared
        if (filter.type === "collection" && filter.id === id) filter = { type: "all" };
        render();
      }
      return;
    }
  }

  // 2) Plain filter selection.
  const btn = e.target.closest(".filter");
  if (!btn) return;
  const type = btn.dataset.filter;
  if (type === "tag") filter = { type: "tag", tag: btn.dataset.tag };
  else if (type === "collection") filter = { type: "collection", id: btn.dataset.id };
  else filter = { type };
  render();
}

// ------------------------------------------------------------------
// Work out which cards to show: apply the sidebar filter, the search
// box, and the chosen sort order.
// ------------------------------------------------------------------
function getVisible() {
  const query = searchInput.value.trim().toLowerCase();

  let list = allCards.filter((card) => {
    if (filter.type === "pinned" && !card.pinned) return false;
    if (filter.type === "untagged" && card.tags.length) return false;
    if (filter.type === "tag" && !card.tags.includes(filter.tag)) return false;
    if (filter.type === "collection" && card.collectionId !== filter.id) return false;

    if (query) {
      const haystack = [card.title, card.url, card.text, card.note, card.tags.join(" ")]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const sort = sortSelect.value;
  list = list.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; // pinned always first
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "oldest") return a.createdAt - b.createdAt;
    return b.createdAt - a.createdAt; // newest
  });
  return list;
}

// ------------------------------------------------------------------
// Draw everything.
// ------------------------------------------------------------------
function render() {
  // Drop any selected ids that no longer exist.
  const existing = new Set(allCards.map((c) => c.id));
  selected = new Set([...selected].filter((id) => existing.has(id)));

  renderFilters();
  renderStats();
  renderBulkBar();

  const visible = getVisible();
  board.replaceChildren();

  emptyState.hidden = allCards.length !== 0;
  noResults.hidden = !(allCards.length > 0 && visible.length === 0);

  for (const card of visible) board.appendChild(buildCard(card));
}

// ---- Sidebar filters -------------------------------------------------
function renderFilters() {
  const total = allCards.length;
  const pinned = allCards.filter((c) => c.pinned).length;
  const untagged = allCards.filter((c) => c.tags.length === 0).length;

  // Count how many cards use each tag.
  const tagCounts = new Map();
  for (const card of allCards)
    for (const t of card.tags) tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
  const tags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  filtersEl.replaceChildren();
  filtersEl.appendChild(filterBtn("all", "All cards", total, filter.type === "all"));
  filtersEl.appendChild(filterBtn("pinned", "★ Pinned", pinned, filter.type === "pinned"));
  filtersEl.appendChild(filterBtn("untagged", "Untagged", untagged, filter.type === "untagged"));

  // --- Collections section (with a "+" to add one) ---
  const collHeading = document.createElement("div");
  collHeading.className = "filter-heading heading-row";
  const collLabel = document.createElement("span");
  collLabel.textContent = "Collections";
  const addBtn = document.createElement("button");
  addBtn.className = "mini-add";
  addBtn.type = "button";
  addBtn.dataset.manage = "add-collection";
  addBtn.title = "New collection";
  addBtn.textContent = "＋";
  collHeading.append(collLabel, addBtn);
  filtersEl.appendChild(collHeading);

  if (collections.length === 0) {
    const hint = document.createElement("p");
    hint.className = "filter-hint";
    hint.textContent = "No collections yet";
    filtersEl.appendChild(hint);
  }
  const collCounts = new Map();
  for (const card of allCards)
    if (card.collectionId) collCounts.set(card.collectionId, (collCounts.get(card.collectionId) || 0) + 1);
  for (const c of collections) {
    const active = filter.type === "collection" && filter.id === c.id;
    filtersEl.appendChild(collectionRow(c, collCounts.get(c.id) || 0, active));
  }

  // --- Tags section ---
  if (tags.length) {
    const h = document.createElement("p");
    h.className = "filter-heading";
    h.textContent = "Tags";
    filtersEl.appendChild(h);
    for (const [tag, count] of tags) {
      const active = filter.type === "tag" && filter.tag === tag;
      filtersEl.appendChild(filterBtn("tag", tag, count, active, tag));
    }
  }
}

/** A collection row: a filter button plus tiny rename/delete controls. */
function collectionRow(collection, count, active) {
  const btn = document.createElement("button");
  btn.className = "filter" + (active ? " active" : "");
  btn.type = "button";
  btn.dataset.filter = "collection";
  btn.dataset.id = collection.id;

  const dot = document.createElement("span");
  dot.className = "fdot";
  dot.style.background = collection.color;
  btn.appendChild(dot);

  const text = document.createElement("span");
  text.className = "fname";
  text.textContent = collection.name;
  btn.appendChild(text);

  const rename = document.createElement("span");
  rename.className = "row-icon";
  rename.dataset.manage = "rename";
  rename.dataset.id = collection.id;
  rename.title = "Rename";
  rename.textContent = "✎";

  const del = document.createElement("span");
  del.className = "row-icon";
  del.dataset.manage = "delete";
  del.dataset.id = collection.id;
  del.title = "Delete";
  del.textContent = "✕";

  const c = document.createElement("span");
  c.className = "fcount";
  c.textContent = count;

  btn.append(rename, del, c);
  return btn;
}

function filterBtn(type, label, count, active, tag) {
  const btn = document.createElement("button");
  btn.className = "filter" + (active ? " active" : "");
  btn.type = "button";
  btn.dataset.filter = type;
  if (tag) btn.dataset.tag = tag;

  if (type === "tag") {
    const dot = document.createElement("span");
    dot.className = "fdot";
    dot.style.background = avatarColor(tag);
    btn.appendChild(dot);
  }
  const text = document.createElement("span");
  text.textContent = label;
  btn.appendChild(text);

  const c = document.createElement("span");
  c.className = "fcount";
  c.textContent = count;
  btn.appendChild(c);
  return btn;
}

// ---- Stats -----------------------------------------------------------
function renderStats() {
  const tagSet = new Set();
  for (const c of allCards) for (const t of c.tags) tagSet.add(t);
  const withText = allCards.filter((c) => c.text).length;

  // Build with DOM nodes (no innerHTML) so this stays safe even if the
  // labels ever include text rather than plain numbers.
  statsEl.replaceChildren();
  const parts = [
    [allCards.length, "cards"],
    [tagSet.size, "tags"],
    [withText, "with a quote"],
  ];
  parts.forEach(([n, label], i) => {
    if (i > 0) statsEl.append(" · ");
    const b = document.createElement("b");
    b.textContent = String(n);
    statsEl.append(b, " " + label);
  });
}

// ---- Bulk toolbar ----------------------------------------------------
function renderBulkBar() {
  const visible = getVisible();
  const count = selected.size;

  bulkActions.hidden = count === 0;
  selectionLabel.textContent = count > 0 ? `${count} selected` : "Select all";

  // Reflect whether all visible cards are selected.
  const allVisibleSelected =
    visible.length > 0 && visible.every((c) => selected.has(c.id));
  selectAll.checked = allVisibleSelected;
  selectAll.indeterminate = count > 0 && !allVisibleSelected;
}

// ---- One card --------------------------------------------------------
function buildCard(card) {
  const el = document.createElement("article");
  el.className =
    "card" + (card.pinned ? " pinned" : "") + (selected.has(card.id) ? " selected" : "");
  el.dataset.id = card.id;

  // Screenshot thumbnail (only for a real image, and not while editing).
  if (isImageDataUrl(card.thumb) && editingId !== card.id) {
    const img = document.createElement("img");
    img.className = "card-thumb";
    img.src = card.thumb;
    img.alt = "";
    img.loading = "lazy";
    el.appendChild(img);
  }

  // Head: checkbox + avatar + title/meta.
  const head = document.createElement("div");
  head.className = "card-head";

  const check = document.createElement("input");
  check.type = "checkbox";
  check.className = "card-check";
  check.checked = selected.has(card.id);
  check.dataset.role = "select";
  head.appendChild(check);

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = avatarLetter(card);
  avatar.style.background = avatarColor(shortUrl(card.url) || card.title);
  head.appendChild(avatar);

  const headings = document.createElement("div");
  headings.className = "card-headings";
  const title = document.createElement("p");
  title.className = "card-title";
  const safe = safeUrl(card.url);
  if (safe) {
    const link = document.createElement("a");
    link.href = safe;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = card.title;
    title.appendChild(link);
  } else {
    title.textContent = card.title; // unsafe/missing URL → not clickable
  }
  headings.appendChild(title);
  const meta = document.createElement("p");
  meta.className = "card-meta";
  meta.textContent = `${formatDateFull(card.createdAt)} · ${shortUrl(card.url)}`;
  headings.appendChild(meta);
  head.appendChild(headings);
  el.appendChild(head);

  if (editingId === card.id) {
    el.appendChild(buildEditForm(card));
    return el;
  }

  if (card.text) {
    const text = document.createElement("p");
    text.className = "card-text";
    text.textContent = card.text;
    el.appendChild(text);
  }
  if (card.note) {
    const note = document.createElement("p");
    note.className = "card-note";
    note.textContent = card.note;
    el.appendChild(note);
  }
  const collection = collections.find((c) => c.id === card.collectionId);
  if (collection) {
    const chip = document.createElement("div");
    chip.className = "collection-chip";
    const dot = document.createElement("span");
    dot.className = "cdot";
    dot.style.background = collection.color;
    const name = document.createElement("span");
    name.textContent = "🗂 " + collection.name;
    chip.append(dot, name);
    el.appendChild(chip);
  }
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
    el.appendChild(tags);
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    actBtn("pin", card.pinned ? "★ Pinned" : "☆ Pin", "star" + (card.pinned ? " on" : "")),
    actBtn("copy", "⧉ Copy"),
    actBtn("edit", "✎ Edit"),
    spacer(),
    actBtn("delete", "🗑 Delete", "danger")
  );
  el.appendChild(actions);
  return el;
}

function actBtn(action, label, cls) {
  const b = document.createElement("button");
  b.className = "act" + (cls ? " " + cls : "");
  b.type = "button";
  b.dataset.action = action;
  b.textContent = label;
  return b;
}
function spacer() {
  const s = document.createElement("span");
  s.className = "act spacer";
  return s;
}

function buildEditForm(card) {
  const form = document.createElement("div");
  form.className = "edit-form";
  const note = document.createElement("textarea");
  note.className = "edit-note";
  note.placeholder = "Note";
  note.value = card.note;
  form.appendChild(note);
  const row = document.createElement("div");
  row.className = "edit-row";
  const tags = document.createElement("input");
  tags.className = "edit-tags";
  tags.type = "text";
  tags.placeholder = "tags, comma separated";
  tags.value = card.tags.join(", ");
  row.appendChild(tags);
  form.appendChild(row);
  const actions = document.createElement("div");
  actions.className = "edit-actions";
  const save = document.createElement("button");
  save.className = "btn-primary";
  save.type = "button";
  save.dataset.action = "save-edit";
  save.textContent = "Save";
  const cancel = document.createElement("button");
  cancel.className = "btn ghost";
  cancel.type = "button";
  cancel.dataset.action = "cancel-edit";
  cancel.textContent = "Cancel";
  actions.append(save, cancel);
  form.appendChild(actions);
  return form;
}

// ------------------------------------------------------------------
// Per-card clicks and checkbox changes.
// ------------------------------------------------------------------
async function onBoardClick(e) {
  const cardEl = e.target.closest(".card");
  if (!cardEl) return;
  const id = cardEl.dataset.id;

  const tagBtn = e.target.closest('[data-action="filter-tag"]');
  if (tagBtn) {
    filter = { type: "tag", tag: tagBtn.dataset.tag };
    render();
    return;
  }

  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === "pin") {
    await togglePin(id);
    const c = allCards.find((x) => x.id === id);
    if (c) c.pinned = !c.pinned;
    render();
  } else if (action === "copy") {
    const card = allCards.find((x) => x.id === id);
    try {
      await navigator.clipboard.writeText(markdownForCard(card));
      toast("Copied as Markdown");
    } catch {
      toast("Couldn't copy");
    }
  } else if (action === "edit") {
    editingId = id;
    render();
  } else if (action === "cancel-edit") {
    editingId = null;
    render();
  } else if (action === "save-edit") {
    const note = cardEl.querySelector(".edit-note").value;
    const tags = cleanTags(cardEl.querySelector(".edit-tags").value.split(","));
    const updated = await updateCard(id, { note, tags });
    if (updated) {
      const idx = allCards.findIndex((c) => c.id === id);
      if (idx > -1) allCards[idx] = updated;
    }
    editingId = null;
    render();
    toast("Updated ✓");
  } else if (action === "delete") {
    await deleteCard(id);
    allCards = allCards.filter((c) => c.id !== id);
    selected.delete(id);
    render();
    toast("Deleted");
  }
}

function onBoardChange(e) {
  const check = e.target.closest('[data-role="select"]');
  if (!check) return;
  const id = e.target.closest(".card").dataset.id;
  if (check.checked) selected.add(id);
  else selected.delete(id);
  // Update selection UI without a full redraw (keeps scroll position).
  e.target.closest(".card").classList.toggle("selected", check.checked);
  renderBulkBar();
}

// ------------------------------------------------------------------
// Bulk actions on the selected cards.
// ------------------------------------------------------------------
async function onBulk(kind) {
  const ids = [...selected];
  const cards = allCards.filter((c) => ids.includes(c.id));
  if (cards.length === 0) return;

  if (kind === "clear") {
    selected.clear();
    render();
    return;
  }

  if (kind === "copy") {
    const md = cards.map(markdownForCard).join("\n\n---\n\n");
    try {
      await navigator.clipboard.writeText(md);
      toast(`Copied ${cards.length} cards as Markdown`);
    } catch {
      toast("Couldn't copy");
    }
    return;
  }

  if (kind === "export") {
    exportCards(cards, "selected");
    return;
  }

  if (kind === "tag") {
    const input = window.prompt("Add tag(s) to selected cards (comma separated):");
    if (!input) return;
    const newTags = cleanTags(input.split(","));
    if (!newTags.length) return;
    for (const card of cards) {
      const merged = cleanTags([...card.tags, ...newTags]);
      const updated = await updateCard(card.id, { tags: merged });
      if (updated) {
        const idx = allCards.findIndex((c) => c.id === card.id);
        if (idx > -1) allCards[idx] = updated;
      }
    }
    render();
    toast(`Tagged ${cards.length} cards`);
    return;
  }

  if (kind === "move") {
    // Type a collection name to move into (created if new). Blank = ungroup.
    const input = window.prompt(
      "Move selected cards to which collection?\n(Type a name — leave blank to remove from any collection.)"
    );
    if (input === null) return; // user cancelled
    let collectionId = null;
    if (input.trim()) {
      const created = await addCollection(input);
      collections = await getCollections();
      collectionId = created ? created.id : null;
    }
    for (const card of cards) {
      const updated = await updateCard(card.id, { collectionId });
      if (updated) {
        const idx = allCards.findIndex((c) => c.id === card.id);
        if (idx > -1) allCards[idx] = updated;
      }
    }
    render();
    toast(collectionId ? `Moved ${cards.length} cards` : `Removed ${cards.length} from collection`);
    return;
  }

  if (kind === "delete") {
    if (!window.confirm(`Delete ${cards.length} selected card(s)? This can't be undone.`)) return;
    for (const id of ids) await deleteCard(id);
    allCards = allCards.filter((c) => !selected.has(c.id));
    selected.clear();
    render();
    toast("Deleted selected cards");
    return;
  }
}

// ------------------------------------------------------------------
// Export / import.
// ------------------------------------------------------------------
async function exportCards(cards, label) {
  if (cards.length === 0) {
    toast("Nothing to export");
    return;
  }
  // exportCardsJSON() reads everything; for a subset we build the same
  // shape by hand so the file format stays identical.
  const json =
    label === "all"
      ? await exportCardsJSON()
      : JSON.stringify(
          { app: "quick-capture", version: 1, exportedAt: new Date().toISOString(), cards },
          null,
          2
        );
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `quick-capture-${label}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${cards.length} card${cards.length === 1 ? "" : "s"}`);
}

async function onImport(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const { added, skipped } = await importCardsJSON(await file.text());
    [allCards, collections] = await Promise.all([getCards(), getCollections()]);
    render();
    toast(`Imported ${added} · skipped ${skipped}`);
  } catch (err) {
    console.error("Quick Capture: import failed.", err);
    toast("Import failed — is it a valid export?");
  } finally {
    importFile.value = "";
  }
}

// ------------------------------------------------------------------
// Toast.
// ------------------------------------------------------------------
let toastTimer = null;
function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (toastEl.hidden = true), 1900);
}

/** Refresh the theme toggle button's icon + tooltip. */
function updateThemeButton() {
  const meta = themeMeta(currentTheme);
  themeBtn.textContent = meta.icon;
  themeBtn.title = meta.label + " (click to change)";
}
