/** @module format — Shared dashboard formatting utilities. */

import { formatRelativeTimeFromDate } from "./timezone";

// ── Number Formatters ──────────────────────────────────────────────────

export function formatTokens(
  n: number | null | undefined,
  placeholder = "—",
): string {
  if (n == null) return placeholder;
  if (n === 0) return "0";
  if (n >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    const s = v.toFixed(1);
    return s.endsWith(".0") ? `${s.slice(0, -2)}B` : `${s}B`;
  }
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    const s = v.toFixed(1);
    return s.endsWith(".0") ? `${s.slice(0, -2)}M` : `${s}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    const s = v.toFixed(1);
    return s.endsWith(".0") ? `${s.slice(0, -2)}K` : `${s}K`;
  }
  return String(n);
}

export function formatCost(
  n: number | null | undefined,
  decimals = 2,
  placeholder = "—",
): string {
  if (n == null) return placeholder;
  return `$${n.toFixed(decimals)}`;
}

export function formatNumber(
  n: number | null | undefined,
  locale = "en-US",
  placeholder = "—",
): string {
  if (n == null) return placeholder;
  return n.toLocaleString(locale);
}

// ── Duration Formatter ─────────────────────────────────────────────────

export interface DurationI18n {
  sec: (n: number) => string;
  minSec: (min: number, sec: number) => string;
  hourMin: (hour: number, min: number) => string;
  minutes: (n: number) => string;
  hours: (n: number) => string;
  hoursMin: (hours: number, mins: number) => string;
}

export interface FormatDurationOptions {
  precision?: "ms" | "sec" | "min";
  placeholder?: string;
  i18n?: DurationI18n;
}

type DurationI18nKey =
  | "sec"
  | "minSec"
  | "hourMin"
  | "minutes"
  | "hours"
  | "hoursMin";

export function createDurationI18n(
  t: (key: string, params?: Record<string, unknown>) => string,
  keyMap: Record<DurationI18nKey, string>,
): DurationI18n {
  return {
    sec: (n) => t(keyMap.sec, { sec: n }),
    minSec: (min, sec) => t(keyMap.minSec, { min, sec }),
    hourMin: (hour, min) => t(keyMap.hourMin, { hour, min }),
    minutes: (n) => t(keyMap.minutes, { minutes: n }),
    hours: (n) => t(keyMap.hours, { hours: n }),
    hoursMin: (hours, mins) => t(keyMap.hoursMin, { hours, mins }),
  };
}

/**
 * Format a duration in milliseconds to human-readable string.
 *
 * @example
 * formatDuration(1500) // "1.5s"
 * formatDuration(90000, { precision: "min" }) // "2 min" (with i18n)
 * formatDuration(null) // "—"
 */
export function formatDuration(
  ms: number | null | undefined,
  options?: FormatDurationOptions,
): string {
  const precision = options?.precision ?? "ms";
  const placeholder = options?.placeholder ?? "—";

  if (ms == null || ms <= 0) return placeholder;

  if (precision === "min") {
    const minutes = Math.round(ms / 60_000);
    if (minutes < 60) {
      return options?.i18n?.minutes(minutes) ?? `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins > 0) {
      return options?.i18n?.hoursMin(hours, mins) ?? `${hours}h ${mins}m`;
    }
    return options?.i18n?.hours(hours) ?? `${hours}h`;
  }

  if (precision === "sec") {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  // precision === 'ms'
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) {
    return options?.i18n?.sec(sec) ?? `${sec}s`;
  }
  const min = Math.floor(sec / 60);
  const remainSec = sec % 60;
  if (min < 60) {
    return options?.i18n?.minSec(min, remainSec) ?? `${min}m ${remainSec}s`;
  }
  const hour = Math.floor(min / 60);
  const remainMin = min % 60;
  return options?.i18n?.hourMin(hour, remainMin) ?? `${hour}h ${remainMin}m`;
}

// ── Percent Formatter ──────────────────────────────────────────────────

/**
 * Format a ratio (0-1) as percentage string.
 *
 * @example
 * formatPercent(0.1234) // "12.3%"
 * formatPercent(null) // "—"
 */
export function formatPercent(
  rate: number | null | undefined,
  decimals = 1,
  placeholder = "—",
): string {
  if (rate == null) return placeholder;
  return `${(rate * 100).toFixed(decimals)}%`;
}

// ── Timestamp Formatter ────────────────────────────────────────────────

/**
 * Format a timestamp (ms epoch) to relative time string.
 *
 * @example
 * formatTimestamp(Date.now() - 60000) // "1 min ago"
 * formatTimestamp(null) // "—"
 */
export function formatTimestamp(
  ms: number | null | undefined,
  placeholder = "—",
): string {
  if (ms == null) return placeholder;
  return formatRelativeTimeFromDate(new Date(ms));
}
