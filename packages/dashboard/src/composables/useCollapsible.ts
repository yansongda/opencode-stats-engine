/**
 * In-memory collapsible group composable.
 *
 * Each instance tracks collapsed state for a set of string keys.
 * Unknown keys return the configured default on first access.
 * No persistence — state lives only in the Vue reactive scope.
 */

import { reactive } from "vue";

// ============================================================================
// Types
// ============================================================================

export interface CollapsibleGroup {
  /** Returns true when the key is collapsed. Unknown keys return the default. */
  isCollapsed(key: string): boolean;
  /** Toggle collapsed state. Unknown keys flip from the default. */
  toggle(key: string): void;
  /** Explicitly set collapsed state for a key. */
  setCollapsed(key: string, value: boolean): void;
  /** Clear all state so every key reverts to the default. */
  reset(): void;
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create an independent collapsible group with a given default.
 *
 * Each call produces a fresh instance with its own reactive Map.
 * Do NOT export a shared singleton from this module — callers that need
 * a shared instance should hold the reference themselves.
 */
export function createCollapsibleGroup(
  defaultCollapsed: boolean = true,
): CollapsibleGroup {
  const state = reactive(new Map<string, boolean>());

  function isCollapsed(key: string): boolean {
    const v = state.get(key);
    return v === undefined ? defaultCollapsed : v;
  }

  function toggle(key: string): void {
    const current = isCollapsed(key);
    state.set(key, !current);
  }

  function setCollapsed(key: string, value: boolean): void {
    state.set(key, value);
  }

  function reset(): void {
    state.clear();
  }

  return { isCollapsed, toggle, setCollapsed, reset };
}

// ============================================================================
// Convenience composable for session detail pages
// ============================================================================

/**
 * Returns a fresh default-collapsed group for session detail usage.
 *
 * Each call creates a new instance — no accidental global singleton.
 * Mount/refresh naturally resets state because a new instance is created.
 */
export function useSessionDetailCollapsible(): CollapsibleGroup {
  return createCollapsibleGroup(true);
}
