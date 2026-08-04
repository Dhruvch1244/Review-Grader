// Validated default palette (see the dataviz skill's references/palette.md).
// Fixed hue order - never cycled, never reassigned by rank.
export const CATEGORICAL_LIGHT = [
  "#2a78d6", // 1 blue
  "#eb6834", // 2 orange
  "#1baf7a", // 3 aqua
  "#eda100", // 4 yellow
  "#e87ba4", // 5 magenta
  "#008300", // 6 green
  "#4a3aa7", // 7 violet
  "#e34948", // 8 red
];

export const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

export const STATUS = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
};

export const CHROME = {
  light: {
    surface: "#fcfcfb",
    textPrimary: "#0b0b0b",
    textSecondary: "#52514e",
    muted: "#898781",
    grid: "#e1e0d9",
    baseline: "#c3c2b7",
  },
  dark: {
    surface: "#1a1a19",
    textPrimary: "#ffffff",
    textSecondary: "#c3c2b7",
    muted: "#898781",
    grid: "#2c2c2a",
    baseline: "#383835",
  },
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Sequential single-hue (blue) ramp: t in [0,1], 0 = lowest magnitude. */
export function sequentialBlue(t: number, dark: boolean): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [lo, hi] = dark ? ["#152845", "#86b6ef"] : ["#cde2fb", "#0d366b"];
  const a = hexToRgb(lo);
  const b = hexToRgb(hi);
  return rgbToHex([lerp(a[0], b[0], clamped), lerp(a[1], b[1], clamped), lerp(a[2], b[2], clamped)]);
}

/** score (1-5 or null) -> good/warning/critical status bucket + color. */
export function statusForScore(score: number | null): { label: "Low" | "Mid" | "High"; color: string } {
  if (score === null) return { label: "Low", color: STATUS.critical };
  if (score <= 2) return { label: "Low", color: STATUS.critical };
  if (score === 3) return { label: "Mid", color: STATUS.warning };
  return { label: "High", color: STATUS.good };
}
