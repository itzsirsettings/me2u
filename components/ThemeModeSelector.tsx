"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

import {
  applyThemeMode,
  getStoredThemeMode,
  saveThemeMode,
  themeChangeEvent,
  themeStorageKey,
  type ThemeMode,
} from "@/lib/theme";

const themeOptions: Array<{ label: string; value: ThemeMode }> = [
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
  { label: "System", value: "system" },
];

function subscribeTheme(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === themeStorageKey) onChange();
  };
  window.addEventListener(themeChangeEvent, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(themeChangeEvent, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
const getServerTheme = (): ThemeMode => "system";

export default function ThemeModeSelector({
  variant = "default",
}: {
  variant?: "default" | "reference";
}) {
  const themeMode = useSyncExternalStore(subscribeTheme, getStoredThemeMode, getServerTheme);

  useEffect(() => {
    const initialMode = getStoredThemeMode();
    applyThemeMode(initialMode);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (getStoredThemeMode() === "system") {
        applyThemeMode("system");
      }
    };
    const handleSavedThemeChange = () => {
      applyThemeMode(getStoredThemeMode());
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
    saveThemeMode(mode);
  };

  if (variant === "reference") {
    const icons = { light: Sun, dark: Moon, system: Monitor };
    return (
      <section className="design-card design-theme">
        <h2>Theme</h2>
        <p>Choose how me2u should look on this device.</p>
        <div className="design-theme-options" role="group" aria-label="Theme preference">
          {themeOptions.map((option) => {
            const Icon = icons[option.value];
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={themeMode === option.value}
                onClick={() => selectThemeMode(option.value)}
              >
                <Icon size={20} aria-hidden="true" />
                {option.label}
              </button>
            );
          })}
        </div>
      </section>
    );
  }

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
