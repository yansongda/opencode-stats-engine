<template>
  <section class="collapsible-section">
    <div class="section-header" :class="{ 'section-header--collapsible': collapsible }">
      <button
        v-if="collapsible"
        type="button"
        class="section-toggle"
        :aria-expanded="!isCollapsed"
        :aria-controls="contentId"
        @click="handleToggle"
      >
        <svg
          class="section-chevron"
          :class="{ 'section-chevron--expanded': !isCollapsed }"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4.5 2.5L7.5 6L4.5 9.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="section-title">{{ title }}</span>
      </button>
      <span v-else class="section-title section-title--fixed">{{ title }}</span>
    </div>
    <div
      :id="contentId"
      class="section-content"
      role="region"
      :aria-hidden="collapsible ? isCollapsed : undefined"
      v-show="showContent"
    >
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useSessionDetailCollapsible } from "@/composables/useCollapsible";

const props = withDefaults(
  defineProps<{
    sectionKey: string;
    title: string;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
  }>(),
  {
    collapsible: true,
    defaultCollapsed: true,
  },
);

const group = useSessionDetailCollapsible();

const isCollapsed = computed(() => {
  if (!props.collapsible) return false;
  return group.isCollapsed(props.sectionKey);
});

const showContent = computed(() => !isCollapsed.value);

const contentId = computed(() => `section-content-${props.sectionKey}`);

function handleToggle(): void {
  group.toggle(props.sectionKey);
}

onMounted(() => {
  if (props.collapsible) {
    group.setCollapsed(props.sectionKey, props.defaultCollapsed);
  }
});
</script>

<style scoped>
.collapsible-section {
  border-bottom: 1px solid var(--border);
}

.collapsible-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
}

.section-header--collapsible {
  cursor: default;
}

.section-toggle {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  width: 100%;
  padding: var(--spacing-2) 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  font: inherit;
  text-align: left;
}

.section-toggle:hover {
  color: var(--primary);
}

.section-toggle:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.section-chevron {
  flex-shrink: 0;
  color: var(--text-muted);
  transform: rotate(0deg);
  transition: transform 200ms ease;
}

.section-chevron--expanded {
  transform: rotate(90deg);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-title--fixed {
  padding: var(--spacing-2) 0;
}

.section-content {
  padding-bottom: var(--spacing-3);
}
</style>
