<template>
  <div ref="wrapperRef" class="theme-switcher" :class="{ open: isOpen }">
    <button
      type="button"
      class="theme-trigger"
      data-testid="theme-switcher-trigger"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      :aria-label="t('components.theme')"
      @click="toggle"
    >
      <span class="theme-trigger-symbol" aria-hidden="true">{{ currentOption.symbol }}</span>
      <span class="theme-trigger-label">{{ currentOption.label }}</span>
      <span class="theme-trigger-caret" aria-hidden="true">&#9662;</span>
    </button>
    <Transition name="theme-menu">
      <div
        v-if="isOpen"
        class="theme-menu"
        role="menu"
        data-testid="theme-switcher-menu"
      >
        <button
          v-for="opt in options"
          :key="opt.value"
          type="button"
          role="menuitem"
          class="theme-option"
          :class="{ active: preference === opt.value }"
          :data-testid="`theme-option-${opt.value}`"
          @click="handleSelect(opt.value)"
        >
          <span class="theme-option-symbol" aria-hidden="true">{{ opt.symbol }}</span>
          <span class="theme-option-label">{{ opt.label }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
/**
 * Theme switcher dropdown component.
 *
 * Displays the current theme preference in a trigger button.
 * Opens a dropdown menu with System, Light, and Dark choices;
 * selecting one calls `setPreference` from the useTheme composable
 * and closes the menu.
 *
 * Keyboard: Escape closes. Click outside closes.
 * A11y: trigger has `aria-expanded` + `aria-haspopup="menu"`;
 *       options use `role="menuitem"`.
 */

import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { ThemePreference } from "@/composables/useTheme";
import { useTheme } from "@/composables/useTheme";

const { t } = useI18n();
const { preference, setPreference } = useTheme();

// ── Options ──────────────────────────────────────────────────────────

interface ThemeOption {
  value: ThemePreference;
  symbol: string;
  labelKey: string;
}

const OPTIONS: readonly ThemeOption[] = [
  { value: "system", symbol: "\u25D0", labelKey: "components.system" },
  { value: "light", symbol: "\u2600", labelKey: "components.light" },
  { value: "dark", symbol: "\u263E", labelKey: "components.dark" },
];

const options = computed(() =>
  OPTIONS.map((opt) => ({
    ...opt,
    label: t(opt.labelKey),
  })),
);

const currentOption = computed(() => {
  const match = options.value.find((o) => o.value === preference.value);
  return match ?? options.value[0];
});

// ── State ────────────────────────────────────────────────────────────

const isOpen = ref(false);
const wrapperRef = ref<HTMLDivElement | null>(null);

// ── Actions ──────────────────────────────────────────────────────────

function toggle(): void {
  isOpen.value = !isOpen.value;
}

function close(): void {
  isOpen.value = false;
}

function handleSelect(value: ThemePreference): void {
  setPreference(value);
  close();
}

// ── Click outside ────────────────────────────────────────────────────

function onDocumentClick(e: MouseEvent): void {
  if (!wrapperRef.value?.contains(e.target as Node)) {
    close();
  }
}

// ── Escape key ───────────────────────────────────────────────────────

function onDocumentKeydown(e: KeyboardEvent): void {
  if (e.key === "Escape" && isOpen.value) {
    close();
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────

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

.theme-switcher {
  position: relative;
  display: inline-block;
}

/* ── Trigger button ───────────────────────────────────────────────── */

.theme-trigger {
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

.theme-trigger:hover {
  color: var(--text);
  border-color: var(--primary);
}

.theme-trigger:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.theme-trigger-symbol {
  font-size: var(--text-sm);
  flex-shrink: 0;
  width: 1.5em;
  text-align: center;
}

.theme-trigger-label {
  letter-spacing: 0.02em;
}

.theme-trigger-caret {
  font-size: 0.65em;
  line-height: 1;
  opacity: 0.6;
  transition: transform 0.15s ease;
}

.theme-switcher.open .theme-trigger-caret {
  transform: rotate(180deg);
}

/* ── Dropdown menu ────────────────────────────────────────────────── */

.theme-menu {
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

.theme-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
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

.theme-option:hover {
  color: var(--primary);
}

.theme-option.active {
  color: white;
  font-weight: 600;
  background: var(--primary);
}

.theme-option-symbol {
  font-size: var(--text-sm);
  flex-shrink: 0;
  width: 1.5em;
  text-align: center;
}

/* ── Transition ───────────────────────────────────────────────────── */

.theme-menu-enter-active,
.theme-menu-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.theme-menu-enter-from,
.theme-menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
