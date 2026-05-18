"use client";

import { useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const storageKey = "me2u-theme";
const themeOptions: Array<{ label: string; value: ThemeMode }> = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === "system" ? getSystemTheme() : mode;
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "system";

  const storedTheme = window.localStorage.getItem(storageKey);
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    return storedTheme;
  }

  return "system";
}

function applyThemeMode(mode: ThemeMode) {
  const resolvedTheme = resolveTheme(mode);
  document.documentElement.dataset.themeMode = mode;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
}

export default function ThemeModeSelector() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const initialMode = getStoredThemeMode();
    setThemeMode(initialMode);
    applyThemeMode(initialMode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (getStoredThemeMode() === "system") {
        applyThemeMode("system");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
    }

    mediaQuery.addListener(handleSystemThemeChange);
    return () => mediaQuery.removeListener(handleSystemThemeChange);
  }, []);

  const selectThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    window.localStorage.setItem(storageKey, mode);
    applyThemeMode(mode);
  };

  return (
    <section className="rounded-[var(--mobile-radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-secondary)] p-3 md:rounded-[5px] md:p-4">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
          Theme
        </p>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Choose how me2u should look on this device.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-full bg-[var(--mobile-surface)] p-1 md:rounded-[5px] md:bg-[var(--color-bg-card)]">
        {themeOptions.map((option) => {
          const isSelected = themeMode === option.value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              className={`min-h-11 rounded-full px-2 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] md:rounded-[5px] ${
                isSelected
                  ? "bg-[var(--color-accent-primary)] text-[var(--color-on-accent)]"
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-hover-soft)]"
              }`}
              onClick={() => selectThemeMode(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
