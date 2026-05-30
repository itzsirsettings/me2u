export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const themeStorageKey = "me2u-theme";
export const themeChangeEvent = "me2u-theme-change";

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";

  const storedTheme = window.localStorage.getItem(themeStorageKey);
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme;
  }

  return "system";
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") return;

  const resolvedTheme = resolveTheme(mode);
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function saveThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(themeStorageKey, mode);
  applyThemeMode(mode);
  window.dispatchEvent(new CustomEvent(themeChangeEvent, { detail: mode }));
}
