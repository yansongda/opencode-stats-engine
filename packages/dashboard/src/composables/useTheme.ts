/**
 * Theme preference, resolution, and persistence composable for the Dashboard.
 *
 * Provides tri-state theme management (system / light / dark) with
 * localStorage persistence, system-preference detection via matchMedia,
 * and DOM `data-theme` attribute application.
 */

import { type ComputedRef, computed, type Ref, ref, watch } from "vue";

// ============================================================================
// Types
// ============================================================================

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface UseThemeReturn {
  /** User's theme preference (may be "system"). */
  preference: Ref<ThemePreference>;
  /** The concrete resolved theme after evaluating system preference. */
  resolvedTheme: ComputedRef<ResolvedTheme>;
  /** Set and persist a theme preference; applies DOM attribute immediately. */
  setPreference: (p: ThemePreference) => void;
}

// ============================================================================
// Constants
// ============================================================================

const THEME_STORAGE_KEY = "opencode-stats-theme";
const SUPPORTED_PREFERENCES: readonly ThemePreference[] = [
  "system",
  "light",
  "dark",
];

// ============================================================================
// Type guard
// ============================================================================

function isThemePreference(value: string): value is ThemePreference {
  return (SUPPORTED_PREFERENCES as readonly string[]).includes(value);
}

// ============================================================================
// Standalone helpers
// ============================================================================

/**
 * Read the saved theme preference from localStorage and validate it.
 * Returns `null` when localStorage is unavailable or the stored value
 * is not a supported preference.
 */
function getSavedPreference(): ThemePreference | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored !== null && isThemePreference(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be disabled (private browsing, storage quota, etc.)
  }

  return null;
}

/**
 * Detect the current system color scheme via matchMedia.
 * Returns `"dark"` if the media query matches, `"light"` otherwise.
 * Always returns `"light"` outside a browser environment.
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * Determine the initial preference: saved → default ("system").
 */
function getInitialPreference(): ThemePreference {
  return getSavedPreference() ?? "system";
}

/**
 * Apply the resolved theme to the DOM by setting or removing
 * `data-theme="dark"` on `<html>`.
 *
 * - Dark mode: sets `data-theme="dark"`
 * - Light mode: removes the `data-theme` attribute entirely
 */
function applyThemeToDOM(theme: ResolvedTheme): void {
  if (typeof document === "undefined") return;

  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
}

// ============================================================================
// Module-level singleton state
// ============================================================================

const preference = ref<ThemePreference>(
  getInitialPreference(),
) as Ref<ThemePreference>;

/**
 * Reactive bridge: matchMedia → computed. Without this ref, `resolvedTheme`
 * would not re-evaluate when the OS color-scheme changes while preference
 * is `"system"`, because `getSystemTheme()` is not a reactive dependency.
 */
const systemPrefersDark = ref(getSystemTheme() === "dark");

const resolvedTheme = computed<ResolvedTheme>(() => {
  if (preference.value === "system") {
    return systemPrefersDark.value ? "dark" : "light";
  }
  return preference.value;
});

// Apply theme on module initialization (guarded for SSR).
applyThemeToDOM(resolvedTheme.value);

// ============================================================================
// matchMedia listener (module-level, registered once)
// ============================================================================

if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  mediaQuery.addEventListener("change", (e: MediaQueryListEvent) => {
    systemPrefersDark.value = e.matches;
    if (preference.value === "system") {
      applyThemeToDOM(e.matches ? "dark" : "light");
    }
  });
}

watch(resolvedTheme, (theme) => {
  applyThemeToDOM(theme);
});

// ============================================================================
// Composable
// ============================================================================

/**
 * Theme management composable.
 *
 * Returns the module-level singleton state so all callers share the same
 * reactive preference and resolved theme.
 *
 * @example
 * ```ts
 * const { preference, resolvedTheme, setPreference } = useTheme();
 * setPreference("dark");       // persist + apply
 * setPreference("system");     // follow OS preference
 * ```
 */
export function useTheme(): UseThemeReturn {
  function setPreference(p: ThemePreference): void {
    preference.value = p;

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, p);
      } catch {
        // Silently ignore storage failures.
      }
    }

    applyThemeToDOM(resolvedTheme.value);
  }

  return {
    preference,
    resolvedTheme,
    setPreference,
  };
}
