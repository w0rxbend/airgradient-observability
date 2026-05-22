import { theme, toggleTheme } from "../lib/theme";

export function ThemeToggle() {
  const isLight = () => theme() === "light";

  return (
    <button
      type="button"
      class="theme-toggle"
      aria-label={isLight() ? "Switch to dark theme" : "Switch to light theme"}
      aria-pressed={isLight()}
      onClick={toggleTheme}
    >
      <span class="theme-toggle-track" aria-hidden="true">
        <span class="theme-toggle-thumb">{isLight() ? "☀" : "☾"}</span>
      </span>
      <span class="theme-toggle-label">{isLight() ? "Light" : "Dark"}</span>
    </button>
  );
}
