// format.js
// ------------------------------------------------------------------
// Small formatting helpers shared by the popup and the dashboard.
// Keeping them in one place means we only write (and fix) them once.
// ------------------------------------------------------------------

/** Turn a millisecond timestamp into a short, readable date/time. */
export function formatDate(ms) {
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A longer, friendlier date (used on the roomy dashboard). */
export function formatDateFull(ms) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Show just the site's domain instead of the whole long URL. */
export function shortUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url || "";
  }
}

/** Pick a stable, pleasant colour for a site's letter-avatar. */
export function avatarColor(seed) {
  seed = seed || "•";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return `hsl(${hash}, 55%, 45%)`;
}

/** The first letter to show inside a card's avatar. */
export function avatarLetter(card) {
  const domain = shortUrl(card.url);
  return (domain[0] || card.title[0] || "•").toUpperCase();
}

/** Turn a card into clean Markdown (for pasting into Notion/Docs/Slack). */
export function markdownForCard(card) {
  const lines = [`### ${card.title}`, card.url];
  if (card.text) lines.push("", `> ${card.text.replace(/\n/g, "\n> ")}`);
  if (card.note) lines.push("", `_${card.note}_`);
  if (card.tags.length) lines.push("", card.tags.map((t) => `#${t}`).join(" "));
  lines.push("", `_Saved ${formatDate(card.createdAt)}_`);
  return lines.join("\n");
}
