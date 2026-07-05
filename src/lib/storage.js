// storage.js
// ------------------------------------------------------------------
// Shared helper functions for saving and loading "cards".
// Both the popup and the background script import these functions,
// so all reading/writing of data lives in ONE place. That keeps the
// rest of the code simple and avoids duplicated logic.
//
// We store everything in `chrome.storage.local`, which is a small
// database built into the browser. It:
//   - stays on this computer only (nothing is sent anywhere),
//   - survives browser restarts,
//   - is shared between the popup and the background script.
//
// Note on `chrome` vs `browser`: Chrome uses the `chrome.*` namespace.
// Firefox understands `chrome.*` too, so using it here works on BOTH
// browsers without any extra library.
// ------------------------------------------------------------------

// The single key under which we keep the whole list of cards.
const STORAGE_KEY = "cards";

/**
 * The shape of one card. Kept here as a reference:
 *   id        - unique string
 *   title     - the page title
 *   url       - the page URL
 *   text      - selected text from the page (may be empty)
 *   note      - the user's own note about this card (may be empty)
 *   tags      - array of tag words
 *   pinned    - true if the user starred it (pinned cards sort to the top)
 *   createdAt - milliseconds since 1970 (easy to sort/format)
 */

/**
 * Read every saved card.
 * @returns {Promise<Array>} newest cards first.
 */
export async function getCards() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

/**
 * Overwrite the whole list of cards. Used internally by the helpers below.
 * @param {Array} cards
 */
async function setCards(cards) {
  await chrome.storage.local.set({ [STORAGE_KEY]: cards });
}

/**
 * Build and save a brand new card at the top of the list.
 * @returns {Promise<Object>} the card that was saved
 */
export async function addCard({ title, url, text = "", note = "", tags = [] }) {
  const card = {
    id: newId(),
    title: title || url || "Untitled",
    url: url || "",
    text: (text || "").trim(),
    note: (note || "").trim(),
    tags: cleanTags(tags),
    pinned: false,
    createdAt: Date.now(),
  };

  const cards = await getCards();
  cards.unshift(card); // put the newest card first
  await setCards(cards);
  return card;
}

/**
 * Change some fields of one card (e.g. its note or tags) and save.
 * @param {string} id
 * @param {Object} changes - any of { note, tags, pinned, title, text }
 * @returns {Promise<Object|null>} the updated card, or null if not found
 */
export async function updateCard(id, changes) {
  const cards = await getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return null;

  if ("tags" in changes) changes.tags = cleanTags(changes.tags);
  Object.assign(card, changes);

  await setCards(cards);
  return card;
}

/**
 * Flip a card's "pinned" star on or off.
 * @param {string} id
 */
export async function togglePin(id) {
  const cards = await getCards();
  const card = cards.find((c) => c.id === id);
  if (!card) return;
  card.pinned = !card.pinned;
  await setCards(cards);
}

/**
 * Delete a single card by its id.
 * @param {string} id
 */
export async function deleteCard(id) {
  const cards = await getCards();
  await setCards(cards.filter((c) => c.id !== id));
}

// ------------------------------------------------------------------
// Export / Import — let the user back up or move their data.
// ------------------------------------------------------------------

/**
 * Turn all cards into a pretty JSON string, ready to save as a file.
 * @returns {Promise<string>}
 */
export async function exportCardsJSON() {
  const cards = await getCards();
  const payload = {
    app: "quick-capture",
    version: 1,
    exportedAt: new Date().toISOString(),
    cards,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Add cards from an exported JSON string. Existing cards are kept;
 * cards whose id already exists are skipped so re-importing is safe.
 * @param {string} jsonText
 * @returns {Promise<{added: number, skipped: number}>}
 */
export async function importCardsJSON(jsonText) {
  const data = JSON.parse(jsonText);
  // Accept either the wrapped format { cards: [...] } or a bare array.
  const incoming = Array.isArray(data) ? data : data.cards;
  if (!Array.isArray(incoming)) {
    throw new Error("This file doesn't look like a Quick Capture export.");
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

/**
 * Make sure an imported object has every field with a safe value.
 */
function sanitizeCard(raw) {
  const obj = raw && typeof raw === "object" ? raw : {};
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : newId(),
    title: str(obj.title) || str(obj.url) || "Untitled",
    url: str(obj.url),
    text: str(obj.text),
    note: str(obj.note),
    tags: cleanTags(obj.tags || []),
    pinned: Boolean(obj.pinned),
    createdAt: Number(obj.createdAt) || Date.now(),
  };
}

// ------------------------------------------------------------------
// Small shared utilities.
// ------------------------------------------------------------------

/** A simple unique id: current time + a random suffix. */
function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Coerce anything to a trimmed string. */
function str(v) {
  return v == null ? "" : String(v).trim();
}

/**
 * Tidy a list of tags: trim spaces, drop empties, lowercase, de-duplicate.
 * @param {string[]} tags
 * @returns {string[]}
 */
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
