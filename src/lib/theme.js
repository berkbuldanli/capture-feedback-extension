// theme.js
// ------------------------------------------------------------------
// Shared light/dark theme handling for the popup, dashboard, and
// welcome page.
//
// How it works: the CSS defines dark colours for two situations —
// when the OS is in dark mode, and when <html> has data-theme="dark".
// Setting data-theme to "light" or "dark" lets the user override the
// system setting; removing it means "follow the system".
// ------------------------------------------------------------------

import { getSettings, setSetting } from "./storage.js";

// The cycle order for the toggle button: System → Light → Dark → System.
const ORDER = ["system", "light", "dark"];

const META = {
  system: { icon: "🖥️", label: "Theme: System" },
  light: { icon: "☀️", label: "Theme: Light" },
  dark: { icon: "🌙", label: "Theme: Dark" },
};

/** Apply a theme value to the page (does not save it). */
export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "light" || theme === "dark") root.dataset.theme = theme;
  else root.removeAttribute("data-theme"); // "system"
}

/** Read the saved theme and apply it. Call this on every page load. */
export async function initTheme() {
  const { theme } = await getSettings();
  applyTheme(theme);
  return theme;
}

/** The icon + label to show for a theme value (for a toggle button). */
export function themeMeta(theme) {
  return META[theme] || META.system;
}

/** The next theme in the cycle after the given one. */
export function nextTheme(theme) {
  const i = ORDER.indexOf(theme);
  return ORDER[(i + 1) % ORDER.length];
}

/** Persist a theme choice and apply it. */
export async function saveTheme(theme) {
  await setSetting("theme", theme);
  applyTheme(theme);
}
