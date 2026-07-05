// storage.js
// ------------------------------------------------------------------
// Shared helper functions for saving and loading data.
// Everything the extension remembers lives here, in three "buckets"
// inside chrome.storage.local (the browser's built-in local database):
//
//   cards        - the captured pages (the main thing)
//   collections  - named groups you can sort cards into
//   settings     - small preferences (e.g. "capture screenshots?")
//
// storage.local stays on this computer only (nothing is sent anywhere)
// and survives browser restarts. Chrome and Firefox both understand the
// `chrome.*` namespace, so this file works on both browsers unchanged.
// ------------------------------------------------------------------

const CARDS_KEY = "cards";
const COLLECTIONS_KEY = "collections";
const SETTINGS_KEY = "settings";

// Default preferences, used when the user hasn't changed anything yet.
const DEFAULT_SETTINGS = {
  captureScreenshots: true, // save a small thumbnail image with each card
  theme: "system", // "system" | "light" | "dark"
};

/**
 * The shape of one card (for reference):
 *   id           - unique string
 *   title        - the page title
 *   url          - the page URL
 *   text         - selected text from the page (may be empty)
 *   note         - the user's own note (may be empty)
 *   tags         - array of tag words
 *   collectionId - id of the collection it belongs to (or null)
 *   thumb        - a small screenshot as a data URL (or "")
 *   pinned       - true if starred (pinned cards sort to the top)
 *   createdAt    - milliseconds since 1970
 */

// ==================================================================
// CARDS
// ==================================================================

/** Read every saved card (newest first). */
export async function getCards() {
  const result = await chrome.storage.local.get(CARDS_KEY);
  return result[CARDS_KEY] || [];
}

/** Overwrite the whole list of cards. Used internally. */
async function setCards(cards) {
  await chrome.storage.local.set({ [CARDS_KEY]: cards });
}

/** Build and save a brand new card at the top of the list. */
export async function addCard({
  title,
  url,
  text = "",
  note = "",
  tags = [],
  collectionId = null,
  thumb = "",
}) {
  const card = {
    id: newId(),
    title: title || url || "Untitled",
    url: url || "",
    text: (text || "").trim(),
    note: (note || "").trim(),
    tags: cleanTags(tags),
    collectionId: collectionId || null,
    thumb: thumb || "",
    pinned: false,
    createdAt: Date.now(),
  };

  const cards = await getCards();
  cards.unshift(card);
  await setCards(cards);
  return card;
}

/** Change some fields of one card (note, tags, collectionId, …) and save. */
export async function updateCard(id, changes) {
  const cards = await getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return null;

  if ("tags" in changes) changes.tags = cleanTags(changes.tags);
  Object.assign(card, changes);

  await setCards(cards);
  return card;
}

/** Flip a card's "pinned" star on or off. */
export async function togglePin(id) {
  const cards = await getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  card.pinned = !card.pinned;
  await setCards(cards);
}

/** Delete a single card by its id. */
export async function deleteCard(id) {
  const cards = await getCards();
  await setCards(cards.filter((c) => c.id !== id));
}

// ==================================================================
// COLLECTIONS
// ==================================================================

/** Read all collections. */
export async function getCollections() {
  const result = await chrome.storage.local.get(COLLECTIONS_KEY);
  return result[COLLECTIONS_KEY] || [];
}

async function setCollections(collections) {
  await chrome.storage.local.set({ [COLLECTIONS_KEY]: collections });
}

/** Create a new collection and return it. Reuses one if the name exists. */
export async function addCollection(name) {
  const clean = String(name || "").trim();
  if (!clean) return null;

  const collections = await getCollections();
  const existing = collections.find(
    (c) => c.name.toLowerCase() === clean.toLowerCase()
  );
  if (existing) return existing;

  const collection = {
    id: newId(),
    name: clean,
    color: pickColor(clean),
    createdAt: Date.now(),
  };
  collections.push(collection);
  await setCollections(collections);
  return collection;
}

/** Rename a collection. */
export async function renameCollection(id, name) {
  const clean = String(name || "").trim();
  if (!clean) return;
  const collections = await getCollections();
  const c = collections.find((x) => x.id === id);
  if (!c) return;
  c.name = clean;
  await setCollections(collections);
}

/**
 * Delete a collection. Cards that were in it are kept but moved back to
 * "no collection" so nothing is lost.
 */
export async function deleteCollection(id) {
  const collections = await getCollections();
  await setCollections(collections.filter((c) => c.id !== id));

  const cards = await getCards();
  let changed = false;
  for (const card of cards) {
    if (card.collectionId === id) {
      card.collectionId = null;
      changed = true;
    }
  }
  if (changed) await setCards(cards);
}

// ==================================================================
// SETTINGS
// ==================================================================

/** Read preferences, filling in any missing ones with defaults. */
export async function getSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
}

/** Change one preference and save. */
export async function setSetting(key, value) {
  const settings = await getSettings();
  settings[key] = value;
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  return settings;
}

// ==================================================================
// EXPORT / IMPORT  (cards + collections travel together)
// ==================================================================

/** Turn everything into a pretty JSON string, ready to save as a file. */
export async function exportCardsJSON() {
  const [cards, collections] = await Promise.all([getCards(), getCollections()]);
  return JSON.stringify(
    {
      app: "quick-capture",
      version: 2,
      exportedAt: new Date().toISOString(),
      collections,
      cards,
    },
    null,
    2
  );
}

/**
 * Add cards (and their collections) from an exported JSON string.
 * Existing items are kept; anything whose id already exists is skipped,
 * so re-importing the same file is safe.
 * @returns {Promise<{added:number, skipped:number}>}
 */
export async function importCardsJSON(jsonText) {
  const data = JSON.parse(jsonText);
  const incoming = Array.isArray(data) ? data : data.cards;
  if (!Array.isArray(incoming)) {
    throw new Error("This file doesn't look like a Quick Capture export.");
  }

  // Merge collections first (so imported cards keep their grouping).
  if (Array.isArray(data.collections)) {
    const collections = await getCollections();
    const ids = new Set(collections.map((c) => c.id));
    for (const raw of data.collections) {
      if (raw && typeof raw === "object" && raw.id && !ids.has(raw.id)) {
        ids.add(raw.id);
        collections.push({
          id: String(raw.id),
          name: str(raw.name) || "Untitled",
          color: str(raw.color) || pickColor(str(raw.name)),
          createdAt: Number(raw.createdAt) || Date.now(),
        });
      }
    }
    await setCollections(collections);
  }

  const cards = await getCards();
  const existingIds = new Set(cards.map((c) => c.id));
  let added = 0;
  let skipped = 0;
  for (const raw of incoming) {
    const card = sanitizeCard(raw);
    if (existingIds.has(card.id)) {
      skipped++;
      continue;
    }
    existingIds.add(card.id);
    cards.push(card);
    added++;
  }
  await setCards(cards);
  return { added, skipped };
}

/** Make sure an imported object has every field with a safe value. */
function sanitizeCard(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : newId(),
    title: str(obj.title) || str(obj.url) || "Untitled",
    url: str(obj.url),
    text: str(obj.text),
    note: str(obj.note),
    tags: cleanTags(obj.tags || []),
    collectionId: obj.collectionId ? String(obj.collectionId) : null,
    thumb: typeof obj.thumb === "string" ? obj.thumb : "",
    pinned: Boolean(obj.pinned),
    createdAt: Number(obj.createdAt) || Date.now(),
  };
}

// ==================================================================
// Small shared utilities
// ==================================================================

/** A simple unique id: current time + a random suffix. */
function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Coerce anything to a trimmed string. */
function str(v) {
  return v == null ? "" : String(v).trim();
}

/** A stable colour for a collection, derived from its name. */
function pickColor(seed) {
  seed = seed || "•";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${hash}, 60%, 45%)`;
}

/** Tidy tags: trim, drop empties, lowercase, de-duplicate. */
export function cleanTags(tags) {
  const seen = new Set();
  const out = [];
  for (const raw of tags || []) {
    const t = String(raw).trim().toLowerCase();
    if (t && !seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}
