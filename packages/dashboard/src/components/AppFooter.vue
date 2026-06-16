<template>
  <footer class="app-footer">
    <span class="brand">OpenCode Stats</span>
    <span class="version">v{{ version }}</span>
  </footer>
</template>

<script setup lang="ts">
const version = __APP_VERSION__;
</script>

<style scoped>
.app-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-2);
  height: 32px;
  font-size: var(--text-base);
  color: var(--text-muted);
  background: var(--surface);
  border-top: 1px solid var(--border);
}

@media (max-width: 767px) {
  .app-footer {
    font-size: var(--text-sm);
  }
}
</style>
