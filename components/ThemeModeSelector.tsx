"use client";

import { useEffect, useState } from "react";
import {
  applyThemeMode,
  getStoredThemeMode,
  saveThemeMode,
  themeChangeEvent,
  type ThemeMode,
} from "@/lib/theme";

const themeOptions: Array<{ label: string; value: ThemeMode }> = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

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
    const handleSavedThemeChange = () => {
      setThemeMode(getStoredThemeMode());
    };

    window.addEventListener(themeChangeEvent, handleSavedThemeChange);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () => {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
        window.removeEventListener(themeChangeEvent, handleSavedThemeChange);
      };
    }

    mediaQuery.addListener(handleSystemThemeChange);
    return () => {
      mediaQuery.removeListener(handleSystemThemeChange);
      window.removeEventListener(themeChangeEvent, handleSavedThemeChange);
    };
  }, []);

  const selectThemeMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    saveThemeMode(mode);
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
