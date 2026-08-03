"use client";

import { useEffect } from "react";

/**
 * shadcn's Tailwind setup toggles dark styles off a `.dark` class on
 * <html> (not the media query directly), so we mirror the OS preference
 * onto that class ourselves - keeps shadcn components and the chart
 * palette (which reads the same media query) always in sync.
 */
export default function ThemeSync() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (isDark: boolean) => document.documentElement.classList.toggle("dark", isDark);
    apply(mq.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return null;
}
