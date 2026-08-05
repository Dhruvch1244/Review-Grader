import { Injectable, signal } from "@angular/core";

/**
 * Replaces both the old ThemeSync component and chart-colors.ts's
 * usePrefersDark() hook in one place. This app has no manual dark-mode
 * toggle UI - it's OS-preference-only, mirrored onto a `.dark` class on
 * <html> since Tailwind's dark variant here reads that class, not the
 * media query directly (keeps Spartan/ui components and the chart
 * palette, which both read the same class, always in sync).
 */
@Injectable({ providedIn: "root" })
export class DarkModeService {
  readonly isDark = signal(false);

  constructor() {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (dark: boolean) => {
      this.isDark.set(dark);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply(mq.matches);
    mq.addEventListener("change", (e) => apply(e.matches));
  }
}
