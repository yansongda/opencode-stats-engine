/**
 * Shared chart color palettes for light and dark themes.
 *
 * Light palette derived from existing chart palettes in OverviewView,
 * ProjectsView, and ModelsView (Tailwind-style vibrant colors).
 * Dark palette uses brighter/more-saturated variants for dark backgrounds.
 *
 * All hex values are lowercase to match existing dashboard CSS conventions.
 */

// ── Chart series colors (10 each) ──────────────────────────────────

/** Light-theme chart series colors (Tailwind 500-range equivalents). */
export const CHART_COLORS_LIGHT: readonly string[] = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
] as const;

/** Dark-theme chart series colors (Tailwind 400-range, brighter for dark bg). */
export const CHART_COLORS_DARK: readonly string[] = [
  "#60a5fa", // blue
  "#4ade80", // green
  "#fbbf24", // amber
  "#f87171", // red
  "#a78bfa", // violet
  "#22d3ee", // cyan
  "#fb923c", // orange
  "#f472b6", // pink
  "#2dd4bf", // teal
  "#818cf8", // indigo
] as const;

// ── Theme-aware palette selector ───────────────────────────────────

/**
 * Returns the appropriate chart color palette for the given theme.
 * @param theme - `'light'` or `'dark'`
 */
export function getChartColors(theme: "light" | "dark"): readonly string[] {
  return theme === "light" ? CHART_COLORS_LIGHT : CHART_COLORS_DARK;
}

// ── Text colors ────────────────────────────────────────────────────

export const CHART_TEXT_COLOR_LIGHT = "#64748b" as const;
export const CHART_TEXT_COLOR_DARK = "#94a3b8" as const;

// ── Axis line colors ───────────────────────────────────────────────

export const CHART_AXIS_LINE_LIGHT = "#cbd5e1" as const;
export const CHART_AXIS_LINE_DARK = "#94a3b8" as const;

// ── Split line colors ──────────────────────────────────────────────

export const CHART_SPLIT_LINE_LIGHT = "#e2e8f0" as const;
export const CHART_SPLIT_LINE_DARK = "#475569" as const;

// ── Tooltip background colors ─────────────────────────────────────

export const CHART_TOOLTIP_BG_LIGHT = "#ffffff" as const;
export const CHART_TOOLTIP_BG_DARK = "#1e293b" as const;

// ── Heatmap colors ─────────────────────────────────────────────────

export const HEATMAP_COLORS_LIGHT: readonly string[] = [
  "#ebedf0",
  "#40c463",
] as const;

export const HEATMAP_COLORS_DARK: readonly string[] = [
  "#1f2937",
  "#22c55e",
] as const;
