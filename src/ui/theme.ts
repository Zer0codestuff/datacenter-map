/** Theme (dark/light) handling: persisted, follows OS preference by default. */

export type Theme = "dark" | "light";
const KEY = "dcm.theme";

export function getTheme(): Theme {
  const saved = localStorage.getItem(KEY) as Theme | null;
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "light" ? "#ffffff" : "#10151c");
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  localStorage.setItem(KEY, next);
  applyTheme(next);
  window.dispatchEvent(new CustomEvent<Theme>("dcm:theme", { detail: next }));
  return next;
}
