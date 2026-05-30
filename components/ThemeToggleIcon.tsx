"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  applyThemeMode,
  getStoredThemeMode,
  resolveTheme,
  saveThemeMode,
  themeChangeEvent,
  themeStorageKey,
  type ResolvedTheme,
} from "@/lib/theme";
import { cn } from "@/lib/utils";

interface ThemeToggleIconProps {
  className?: string;
}

export default function ThemeToggleIcon({ className }: ThemeToggleIconProps) {
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  useEffect(() => {
    const syncTheme = () => {
      const mode = getStoredThemeMode();
      applyThemeMode(mode);
      setResolvedTheme(resolveTheme(mode));
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === themeStorageKey) syncTheme();
    };
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    syncTheme();
    window.addEventListener(themeChangeEvent, syncTheme);
    window.addEventListener("storage", handleStorage);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", syncTheme);
    } else {
      mediaQuery.addListener(syncTheme);
    }

    return () => {
      window.removeEventListener(themeChangeEvent, syncTheme);
      window.removeEventListener("storage", handleStorage);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", syncTheme);
      } else {
        mediaQuery.removeListener(syncTheme);
      }
    };
  }, []);

  const nextTheme = resolvedTheme === "light" ? "dark" : "light";
  const label = `Switch to ${nextTheme} mode`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full border border-snow/15 bg-navy/35 text-snow transition-colors hover:border-lime/60 hover:bg-navy/70 hover:text-lime focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-navy",
        className,
      )}
      onClick={() => saveThemeMode(nextTheme)}
    >
      {resolvedTheme === "light" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
    </button>
  );
}
