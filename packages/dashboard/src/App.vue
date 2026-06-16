<template>
  <AppLayout
    :realtime-mode="realtimeMode"
    :last-updated-at="lastUpdatedAt"
    :last-data-updated-at="lastDataUpdatedAt"
    :refreshing="refreshing"
    @refresh="handleRefresh"
    @reconnect="handleReconnect"
  >
    <router-view />
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import AppLayout from "@/components/AppLayout.vue";
import { useSSE } from "@/composables/useSSE";
import { useTheme } from "@/composables/useTheme";
import i18n from "@/i18n";
import { getInitialLocale, setLocale } from "@/i18n/composables/useLocale";

useTheme();
const sse = useSSE();
const { realtimeMode, lastUpdatedAt, lastDataUpdatedAt, refreshing } = sse;

onMounted(() => {
  setLocale(i18n, getInitialLocale());
  sse.connect();
});

onUnmounted(() => {
  sse.disconnect();
});

async function handleRefresh() {
  sse.cancelDebouncedRefresh();
  await sse.refreshCurrentRoute(false);
}

function handleReconnect(): void {
  sse.reconnect();
}
</script>

<style>
:root {
  /* Colors - Light theme */
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --success: #16a34a;
  --danger: #dc2626;
  --warning: #d97706;
  --bg: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-muted: #64748b;
  --surface-elevated: #ffffff;

  /* Interactive states */
  --surface-hover: rgba(0, 0, 0, 0.05);
  --primary-subtle: rgba(59, 130, 246, 0.1);
  --danger-subtle: rgba(239, 68, 68, 0.08);
  --danger-hover: #b91c1c;
  --success-subtle: rgba(34, 197, 94, 0.1);
  --text-muted-subtle: rgba(148, 163, 184, 0.1);
  --overlay-bg: rgba(0, 0, 0, 0.45);
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: -24px 0 48px rgba(0, 0, 0, 0.35);

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;

  /* Font sizes */
  --text-xs: 10px;
  --text-sm: 11px;
  --text-base: 12px;
  --text-lg: 14px;
  --text-xl: 16px;
  --text-2xl: 20px;
}

[data-theme="dark"] {
  --primary: #60a5fa;
  --primary-hover: #3b82f6;
  --success: #4ade80;
  --danger: #f87171;
  --warning: #fbbf24;
  --bg: #0f172a;
  --surface: #1e293b;
  --surface-elevated: #334155;
  --border: #334155;
  --text: #cbd5e1;
  --text-muted: #94a3b8;

  /* Interactive states (dark) */
  --surface-hover: rgba(255, 255, 255, 0.06);
  --primary-subtle: rgba(96, 165, 250, 0.15);
  --danger-subtle: rgba(248, 113, 113, 0.15);
  --danger-hover: #ef4444;
  --success-subtle: rgba(74, 222, 128, 0.15);
  --text-muted-subtle: rgba(148, 163, 184, 0.15);
  --overlay-bg: rgba(0, 0, 0, 0.6);
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: -24px 0 48px rgba(0, 0, 0, 0.5);
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: var(--bg);
  color: var(--text);
  font-size: var(--text-base);
  line-height: 1.5;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
