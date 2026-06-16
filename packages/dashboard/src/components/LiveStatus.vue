<template>
  <span class="live-status" :class="statusClass" data-testid="live-status">
    <span class="dot"></span>
    <span class="label">{{ statusLabel }}</span>
    <span class="separator"> </span>
    <span class="time">{{ formattedTime }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { formatTimestamp } from "@/utils/timezone";

const { t } = useI18n();

const props = defineProps<{
  status: "live" | "polling" | "offline";
  updatedAt?: number;
}>();

const STATUS_FALLBACKS: Record<string, string> = {
  live: "Live",
  polling: "Polling",
  offline: "Offline",
};

const statusClass = computed(() => `status-${props.status}`);

const statusLabel = computed(() => {
  const key = `common.status${props.status.charAt(0).toUpperCase()}${props.status.slice(1)}`;
  const translated = t(key);
  // vue-i18n returns the key path when translation is missing
  if (translated === key) {
    return STATUS_FALLBACKS[props.status] ?? props.status;
  }
  return translated;
});

const formattedTime = computed(() =>
  formatTimestamp(props.updatedAt, { withSeconds: true }),
);
</script>

<style scoped>
.live-status {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-1);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
  white-space: nowrap;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status-live .dot {
  background-color: var(--success);
  animation: pulse-live 2s ease-in-out infinite;
}

.status-polling .dot {
  background-color: var(--warning);
  animation: pulse-polling 3s ease-in-out infinite;
}

.status-offline .dot {
  background-color: var(--text-muted);
}

.label {
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-live .label {
  color: var(--success);
}

.status-polling .label {
  color: var(--warning);
}

.status-offline .label {
  color: var(--text-muted);
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes pulse-polling {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
