"use client";

import Icons8Icon from "@/components/Icons8Icon";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const storageKey = "me2u-theme";

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const storedTheme = window.localStorage.getItem(storageKey);
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const isDark = theme === "dark";

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      aria-pressed={isDark}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={toggleTheme}
      className="fixed right-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-[80] inline-flex h-11 w-11 items-center justify-center rounded-[5px] border border-[var(--color-border)] bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-[3px_3px_0px_var(--color-shadow)] transition-all hover:translate-y-[2px] hover:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-primary)] md:bottom-6 md:right-6 md:top-auto md:h-12 md:w-12"
    >
      <Icons8Icon name={isDark ? "sun" : "moon"} size={22} />
    </button>
  );
}
