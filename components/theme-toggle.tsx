"use client";

import { useEffect, useMemo, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const STORAGE_KEY = "watchlist-theme";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const label = useMemo(() => (theme === "dark" ? "Dark" : "Light"), [theme]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "cosmic-button inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-2 text-xs font-medium shadow-md backdrop-blur",
        className,
      )}
      aria-label={`Use ${theme === "dark" ? "light" : "dark"} mode`}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <MoonStar className="h-4 w-4 text-amber-300" aria-hidden />
      ) : (
        <SunMedium className="h-4 w-4 text-indigo-600" aria-hidden />
      )}
      <span className="hidden sm:inline">Theme</span>
      <span className="rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
        {label}
      </span>
    </Button>
  );
}
