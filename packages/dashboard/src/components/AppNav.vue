<template>
  <nav class="app-nav" data-testid="app-nav">
    <div class="nav-logo">
      <span class="logo-icon">📊</span>
      <span class="logo-text">OpenCode Stats</span>
    </div>
    <button
      class="nav-hamburger"
      data-testid="nav-hamburger"
      :aria-label="$t('nav.toggleMenu')"
      @click="menuOpen = !menuOpen"
    >
      {{ menuOpen ? '✕' : '☰' }}
    </button>
    <div class="nav-links" :class="{ 'nav-links-collapsible': true, open: menuOpen }">
      <router-link
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="nav-link"
        :data-testid="`nav-${link.testId}`"
        @click="menuOpen = false"
      >
        {{ link.label }}
      </router-link>
    </div>
    <div class="nav-right">
      <div class="nav-badges">
        <span class="audit-badge" :title="$t('nav.auditCompleteTitle')">{{ $t('nav.auditComplete') }}</span>
        <span class="privacy-badge" :title="$t('nav.localPrivacyTitle')">{{ $t('nav.localPrivacy') }}</span>
      </div>
      <div class="nav-controls">
        <LanguageSwitcher />
        <ThemeSwitcher />
      </div>
      <div class="nav-status">
        <LiveStatus
          :status="liveStatus"
          :updated-at="updatedAtMs"
        />
        <button
          v-if="realtimeMode === 'disconnected'"
          class="reconnect-btn"
          data-testid="reconnect-btn"
          @click="$emit('reconnect')"
        >
          {{ $t('nav.reconnect') }}
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import LiveStatus from "@/components/LiveStatus.vue";
import ThemeSwitcher from "@/components/ThemeSwitcher.vue";
import type { RealtimeMode } from "@/composables/useSSE";

const { t } = useI18n();

const props = defineProps<{
  realtimeMode: RealtimeMode;
  lastUpdatedAt: Date | null;
  lastDataUpdatedAt: Date | null;
  refreshing: boolean;
}>();

defineEmits<{
  refresh: [];
  reconnect: [];
}>();

const menuOpen = ref(false);

const links = computed(() => [
  { to: "/", label: t("nav.overview"), testId: "overview" },
  { to: "/efficiency", label: t("nav.efficiency"), testId: "efficiency" },
  { to: "/models", label: t("nav.models"), testId: "models" },
  { to: "/projects", label: t("nav.projects"), testId: "projects" },
  { to: "/tools", label: t("nav.tools"), testId: "tools" },
  { to: "/sessions", label: t("nav.sessions"), testId: "sessions" },
]);

const liveStatus = computed<"live" | "polling" | "offline">(() => {
  switch (props.realtimeMode) {
    case "sse":
      return "live";
    case "polling":
      return "polling";
    case "disconnected":
      return "offline";
  }
});

const updatedAtMs = computed(() => props.lastDataUpdatedAt?.getTime());
</script>

<style scoped>
.app-nav {
  display: flex;
  align-items: center;
  gap: var(--spacing-6);
  padding: var(--spacing-3) var(--spacing-4);
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  position: relative;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.logo-icon {
  font-size: var(--text-xl);
}

.logo-text {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text);
}

.nav-right {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
  margin-left: auto;
}

.nav-badges {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.nav-hamburger {
  display: none;
  background: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--spacing-1) var(--spacing-2);
  cursor: pointer;
  color: var(--text);
  font-size: var(--text-lg);
  line-height: 1;
}

.nav-hamburger:hover {
  background-color: var(--surface-hover);
}

.nav-links {
  display: flex;
  gap: var(--spacing-1);
}

.nav-link {
  padding: var(--spacing-2) var(--spacing-3);
  color: var(--text-muted);
  text-decoration: none;
  font-size: var(--text-base);
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.nav-link:hover {
  color: var(--text);
  background-color: var(--surface-hover);
}

.nav-link.router-link-active {
  color: var(--primary);
  background-color: var(--primary-subtle);
}

.nav-status {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.nav-controls {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
}

.reconnect-btn {
  padding: 2px 8px;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--danger);
  background: transparent;
  border: 1px solid var(--danger);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.reconnect-btn:hover {
  background-color: var(--danger);
  color: white;
}

.audit-badge,
.privacy-badge {
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-lg);
  font-weight: 600;
  color: white;
  cursor: help;
}

.audit-badge {
  background-color: var(--success);
}

.privacy-badge {
  background-color: var(--primary);
}

/* ── Mobile: hamburger menu ───────────────────────────────────────── */

@media (max-width: 767px) {
  .nav-hamburger {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nav-links {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background-color: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: var(--spacing-2) var(--spacing-4);
    flex-direction: column;
    gap: var(--spacing-1);
    z-index: 10;
    box-shadow: var(--shadow-sm);
  }

  .nav-links.open {
    display: flex;
  }

  .nav-badges {
    display: none;
  }

  .nav-status {
    display: none;
  }
}

</style>
