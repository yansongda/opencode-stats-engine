/**
 * Locale detection, persistence, and switching composable for the Dashboard.
 *
 * Provides browser-language detection with localStorage fallback,
 * and a `setLocale` helper that keeps i18n instance, localStorage,
 * and `<html lang>` in sync.
 */

import type { Composer } from "vue-i18n";

// ============================================================================
// Types
// ============================================================================

export type SupportedLocale = "zh-CN" | "en-US";

export interface UseLocaleReturn {
  /** Current persisted or detected locale. */
  currentLocale: SupportedLocale;
  /** Toggle to the other supported locale and persist. */
  toggleLocale: () => void;
  /** Programmatically set a specific locale and persist. */
  setLocale: (locale: SupportedLocale) => void;
}

// A structural type matching the shape of the i18n instance returned by
// `createI18n({ legacy: false })`.  Avoids importing the full `I18n` generic
// which carries complex type parameters irrelevant here.
export interface I18nLike {
  global: Pick<Composer, "locale">;
}

// ============================================================================
// Constants
// ============================================================================

const LOCALE_STORAGE_KEY = "opencode-stats-locale";
const SUPPORTED_LOCALES: readonly SupportedLocale[] = ["zh-CN", "en-US"];
const DEFAULT_LOCALE: SupportedLocale = "zh-CN";

// ============================================================================
// Type guard
// ============================================================================

function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// ============================================================================
// Standalone helpers (exported for direct use)
// ============================================================================

/**
 * Read the saved locale from localStorage and validate it against the
 * supported set.  Returns `null` when localStorage is unavailable or the
 * stored value is not a supported locale.
 */
export function getSavedLocale(): SupportedLocale | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored !== null && isSupportedLocale(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be disabled (private browsing, storage quota, etc.)
  }

  return null;
}

/**
 * Detect locale from `navigator.language` and map to a supported locale.
 *
 * - `zh*` → `zh-CN`
 * - `en*` → `en-US`
 * - anything else → `null`
 */
export function detectBrowserLocale(): SupportedLocale | null {
  if (typeof navigator === "undefined") return null;

  const lang = navigator.language?.split("-")[0];
  if (lang === "zh") return "zh-CN";
  if (lang === "en") return "en-US";
  return null;
}

/**
 * Determine the initial locale: saved → browser-detected → default.
 */
export function getInitialLocale(): SupportedLocale {
  return getSavedLocale() ?? detectBrowserLocale() ?? DEFAULT_LOCALE;
}

/**
 * Set the active locale on the i18n instance, persist to localStorage,
 * and update `<html lang>`.
 */
export function setLocale(i18n: I18nLike, locale: SupportedLocale): void {
  i18n.global.locale.value = locale;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Silently ignore storage failures.
    }
  }

  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

// ============================================================================
// Composable
// ============================================================================

/**
 * Create a locale management composable bound to the given vue-i18n instance.
 *
 * Call once at app startup (e.g. in `App.vue` `setup()` or `onMounted`).
 * Delegates to the standalone `setLocale` helper for all mutations.
 *
 * @param i18n - The vue-i18n instance created by `createI18n({ legacy: false })`.
 */
export function useLocale(i18n: I18nLike): UseLocaleReturn {
  const initialLocale = getInitialLocale();
  setLocale(i18n, initialLocale);

  function toggleLocale(): void {
    const next: SupportedLocale =
      i18n.global.locale.value === "zh-CN" ? "en-US" : "zh-CN";
    setLocale(i18n, next);
  }

  return {
    get currentLocale() {
      return i18n.global.locale.value as SupportedLocale;
    },
    toggleLocale,
    setLocale: (locale) => setLocale(i18n, locale),
  };
}
