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
 * Read every saved card.
 * @returns {Promise<Array>} newest cards first.
 */
export async function getCards() {
  // storage.local.get returns an object like { cards: [...] }.
  const result = await chrome.storage.local.get(STORAGE_KEY);
  // If nothing has been saved yet, default to an empty list.
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
 * @param {Object} data
 * @param {string} data.title  - the page title
 * @param {string} data.url    - the page URL
 * @param {string} [data.text] - selected text (may be empty)
 * @param {string[]} [data.tags] - list of tag words
 * @returns {Promise<Object>} the card that was saved
 */
export async function addCard({ title, url, text = "", tags = [] }) {
  const card = {
    // A simple unique id: current time + a random suffix.
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title || url || "Untitled",
    url: url || "",
    text: (text || "").trim(),
    tags: cleanTags(tags),
    createdAt: Date.now(), // milliseconds since 1970 — easy to sort/format
  };

  const cards = await getCards();
  cards.unshift(card); // put the newest card first
  await setCards(cards);
  return card;
}

/**
 * Delete a single card by its id.
 * @param {string} id
 */
export async function deleteCard(id) {
  const cards = await getCards();
  await setCards(cards.filter((c) => c.id !== id));
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
