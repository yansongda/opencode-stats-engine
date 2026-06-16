<template>
  <div ref="wrapperRef" class="language-switcher" :class="{ open: isOpen }">
    <button
      type="button"
      class="lang-trigger"
      data-testid="lang-switcher-trigger"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      :aria-label="$t('components.language')"
      @click="toggle"
    >
      <span class="lang-trigger-symbol" aria-hidden="true">&#x1F310;</span>
      <span class="lang-trigger-label">{{ currentLabel }}</span>
      <span class="lang-trigger-caret" aria-hidden="true">&#9662;</span>
    </button>
    <Transition name="lang-menu">
      <div
        v-if="isOpen"
        class="lang-menu"
        role="menu"
        data-testid="lang-switcher-menu"
      >
        <button
          v-for="opt in LOCALES"
          :key="opt.code"
          type="button"
          role="menuitem"
          class="lang-option"
          :class="{ active: opt.code === currentLocale }"
          :data-testid="`lang-option-${opt.code}`"
          @click="handleSelect(opt.code)"
        >
          {{ opt.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * Language switcher dropdown component.
 *
 * Displays the current locale's native name in a trigger button.
 * Opens a dropdown menu with all supported locales; selecting one
 * calls `setLocale` from the useLocale composable and closes the menu.
 *
 * Keyboard: Escape closes. Click outside closes.
 * A11y: trigger has `aria-expanded` + `aria-haspopup="menu"`;
 *       options use `role="menuitem"`.
 */

import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import i18n from "@/i18n";
import type { SupportedLocale } from "@/i18n/composables/useLocale";
import { setLocale } from "@/i18n/composables/useLocale";

// ── Locale constants ────────────────────────────────────────────────

interface LocaleOption {
  code: SupportedLocale;
  label: string;
}

const LOCALES: readonly LocaleOption[] = [
  { code: "zh-CN", label: "中文" },
  { code: "en-US", label: "English" },
];

// ── State ───────────────────────────────────────────────────────────

const isOpen = ref(false);
const wrapperRef = ref<HTMLDivElement | null>(null);

const currentLocale = computed(
  () => i18n.global.locale.value as SupportedLocale,
);

const currentLabel = computed(() => {
  const match = LOCALES.find((l) => l.code === currentLocale.value);
  return match?.label ?? currentLocale.value;
});

// ── Actions ─────────────────────────────────────────────────────────

function toggle(): void {
  isOpen.value = !isOpen.value;
}

function close(): void {
  isOpen.value = false;
}

function handleSelect(code: SupportedLocale): void {
  setLocale(i18n, code);
  close();
}

// ── Click outside ───────────────────────────────────────────────────

function onDocumentClick(e: MouseEvent): void {
  if (!wrapperRef.value?.contains(e.target as Node)) {
    close();
  }
}

// ── Escape key ──────────────────────────────────────────────────────

function onDocumentKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape" && isOpen.value) {
    close();
  }
}

// ── Lifecycle ───────────────────────────────────────────────────────

onMounted(() => {
  document.addEventListener("click", onDocumentClick, true);
  document.addEventListener("keydown", onDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick, true);
  document.removeEventListener("keydown", onDocumentKeydown);
});
</script>

<style scoped>
/* ── Wrapper ──────────────────────────────────────────────────────── */

.language-switcher {
  position: relative;
  display: inline-block;
}

/* ── Trigger button ───────────────────────────────────────────────── */

.lang-trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  padding: 2px var(--spacing-2);
  height: calc(var(--text-sm) * 1.4 + 6px);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  line-height: 1.4;
}

.lang-trigger:hover {
  color: var(--text);
  border-color: var(--primary);
}

.lang-trigger:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.lang-trigger-symbol {
  font-size: var(--text-sm);
  flex-shrink: 0;
  width: 1.5em;
  text-align: center;
  line-height: 1;
}

.lang-trigger-label {
  letter-spacing: 0.02em;
}

.lang-trigger-caret {
  font-size: 0.65em;
  line-height: 1;
  opacity: 0.6;
  transition: transform 0.15s ease;
}

.language-switcher.open .lang-trigger-caret {
  transform: rotate(180deg);
}

/* ── Dropdown menu ────────────────────────────────────────────────── */

.lang-menu {
  position: absolute;
  top: calc(100% + var(--spacing-1));
  right: 0;
  min-width: 100%;
  z-index: 50;
  padding: var(--spacing-1);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

/* ── Menu items ───────────────────────────────────────────────────── */

.lang-option {
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--spacing-1) var(--spacing-3);
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.1s ease;
  line-height: 1.6;
}

.lang-option:hover {
  color: var(--primary);
}

.lang-option.active {
  color: white;
  font-weight: 600;
  background: var(--primary);
}

/* ── Transition ───────────────────────────────────────────────────── */

.lang-menu-enter-active,
.lang-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.lang-menu-enter-from,
.lang-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
