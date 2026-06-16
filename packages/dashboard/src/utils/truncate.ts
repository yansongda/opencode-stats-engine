/** @module truncate — Unicode-safe truncation utilities for dashboard display. */

// ── Axis Label Truncation ──────────────────────────────────────────────

/** Default character-count threshold before truncation kicks in. */
export const AXIS_LABEL_THRESHOLD = 24;

/** Default number of trailing characters to keep after truncation. */
export const AXIS_LABEL_TAIL = 12;

/**
 * Truncate a label for chart axis display.
 *
 * Short labels (≤ threshold characters, counted via `Array.from` for full
 * Unicode safety) are returned as-is.  Longer labels are shortened to
 * `'...' + last N characters`.
 */
export function truncateAxisLabel(
  value: string,
  options?: { threshold?: number; tail?: number },
): string {
  const threshold = options?.threshold ?? AXIS_LABEL_THRESHOLD;
  const tail = options?.tail ?? AXIS_LABEL_TAIL;
  const chars = Array.from(value);
  if (chars.length <= threshold) return value;
  return `...${chars.slice(-tail).join("")}`;
}

// ── ID & Path Truncation ───────────────────────────────────────────────

/** Options for generic ID/path truncation. */
export interface TruncateOptions {
  /** Maximum length before truncation. Default: 12 */
  threshold?: number;
  /** Truncation strategy: 'head' keeps start, 'head-tail' keeps both ends. Default: 'head' */
  strategy?: "head" | "head-tail";
  /** Ellipsis character(s). Default: '…' (Unicode ellipsis) */
  ellipsis?: string;
}

/**
 * Truncate an ID string (session ID, message ID, etc.).
 *
 * @example
 * truncateId("abcdefghijklmnop") // "abcdefgh…"
 * truncateId("abcdefghijklmnop", { strategy: "head-tail" }) // "abcde…lmnop"
 */
export function truncateId(id: string, options?: TruncateOptions): string {
  const threshold = options?.threshold ?? 12;
  const strategy = options?.strategy ?? "head";
  const ellipsis = options?.ellipsis ?? "…";

  if (id.length <= threshold) return id;

  if (strategy === "head-tail") {
    const headLen = Math.ceil((threshold - ellipsis.length) / 2);
    const tailLen = Math.floor((threshold - ellipsis.length) / 2);
    return `${id.slice(0, headLen)}${ellipsis}${id.slice(-tailLen)}`;
  }

  // strategy === 'head'
  const keep = threshold - ellipsis.length;
  return `${id.slice(0, keep)}${ellipsis}`;
}

/**
 * Truncate a project path, preserving the tail (most specific part).
 *
 * @example
 * truncateProject("/Users/foo/bar/baz") // "…foo/bar/baz" (if threshold exceeded)
 */
export function truncateProject(
  path: string,
  options?: { threshold?: number; tail?: number; ellipsis?: string },
): string {
  const threshold = options?.threshold ?? 30;
  const tail = options?.tail ?? 28;
  const ellipsis = options?.ellipsis ?? "…";

  if (path.length <= threshold) return path;
  return `${ellipsis}${path.slice(-tail)}`;
}

/**
 * Truncate a session ID with head-tail strategy (common display pattern).
 *
 * @example
 * truncateSessionId("ses_abcdefghijklmnop") // "ses_abc…lmnop"
 */
export function truncateSessionId(
  id: string,
  options?: { threshold?: number; ellipsis?: string },
): string {
  return truncateId(id, {
    threshold: options?.threshold ?? 12,
    strategy: "head-tail",
    ellipsis: options?.ellipsis ?? "...",
  });
}

/**
 * Truncate a file/project path, preserving meaningful segments.
 *
 * Strategy:
 * - Short paths (≤ threshold) returned as-is
 * - Paths with few segments: tail truncation
 * - Paths with many segments: keep first + "…" + last 2 segments
 *
 * @example
 * truncatePath("/Users/foo/bar/baz") // "…foo/bar/baz" (tail truncation)
 * truncatePath("/a/b/c/d/e/f/g") // "/a/…/f/g" (segment compression)
 */
export function truncatePath(
  path: string,
  options?: { threshold?: number; ellipsis?: string; preserveFirst?: boolean },
): string {
  const threshold = options?.threshold ?? 35;
  const ellipsis = options?.ellipsis ?? "…";
  const preserveFirst = options?.preserveFirst ?? true;

  if (path.length <= threshold) return path;

  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 2) return path;
  if (parts.length <= 3) {
    return `${ellipsis}${path.slice(-(threshold - ellipsis.length))}`;
  }

  if (preserveFirst) {
    return `${parts[0]}${ellipsis}/${parts.slice(-2).join("/")}`;
  }

  return `${ellipsis}/${parts.slice(-2).join("/")}`;
}
