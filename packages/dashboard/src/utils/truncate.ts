/** @module truncate — Unicode-safe axis-label truncation utilities. */

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
