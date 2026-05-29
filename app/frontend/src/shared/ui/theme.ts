import { createSignal } from "solid-js";

export type Theme = "dark" | "light";

const STORAGE_KEY = "airgradient-theme";

function initialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export const [theme, setThemeSignal] = createSignal<Theme>(initialTheme());

export function applyTheme(next: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
}

export function setTheme(next: Theme) {
  setThemeSignal(next);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next);
  }
  applyTheme(next);
}

export function toggleTheme() {
  setTheme(theme() === "dark" ? "light" : "dark");
}
