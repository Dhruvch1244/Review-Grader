import { Injectable, signal } from "@angular/core";

/**
 * Replaces both the old ThemeSync component and chart-colors.ts's
 * usePrefersDark() hook in one place. Locked to light mode regardless of
 * OS preference - no manual toggle UI, isDark always reads false, and the
 * `.dark` class is never applied to <html> (Spartan/ui components and the
 * chart palette both read that class, so leaving it off keeps everything
 * in the light palette).
 */
@Injectable({ providedIn: "root" })
export class DarkModeService {
  readonly isDark = signal(false);
}
