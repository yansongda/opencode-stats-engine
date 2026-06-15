<template>
  <div class="loading-state" :data-testid="testId">
    <div class="loading-spinner" />
    <p v-if="displayMessage" class="loading-message">{{ displayMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    message?: string;
    testId?: string;
  }>(),
  {
    message: undefined,
    testId: "loading-state",
  },
);

const displayMessage = computed(() => props.message ?? t("components.loading"));
</script>

<style scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-6) var(--spacing-4);
  gap: var(--spacing-3);
  min-height: 120px;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-message {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: 0;
}
</style>
