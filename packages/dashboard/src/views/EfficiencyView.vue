<template>
  <div class="view-container" data-testid="efficiency-view">
    <!-- Header -->
    <div class="view-header resp-header">
      <h1 class="view-title">{{ $t('efficiency.title') }}</h1>
      <TimeRangePicker v-model="selectedPeriod" />
    </div>

    <!-- Loading State (initial no-data load only) -->
    <LoadingState v-if="loading && !efficiencyData" :message="$t('efficiency.loading')" test-id="efficiency-loading" />

    <!-- Error State (no data to display) -->
    <EmptyState
      v-else-if="error && !efficiencyData"
      variant="error"
      :title="$t('common.dataLoadFailed')"
      :description="error"
      :action-label="$t('common.retry')"
      test-id="efficiency-error"
      @action="() => fetchData()"
    />

    <!-- Content (preserved during background refresh) -->
    <template v-else-if="efficiencyData">
    <!-- Efficiency Metric Cards -->
    <div class="metrics-grid resp-metrics-4">
      <MetricCard
        :label="$t('efficiency.avgSessionDuration')"
        :value="avgSessionDuration"
        :subtitle="$t('efficiency.avgSessionDurationSubtitle')"
        test-id="metric-avg-duration"
      />
      <MetricCard
        :label="$t('efficiency.costPerSession')"
        :value="costPerSession"
        :subtitle="$t('efficiency.costPerSessionSubtitle')"
        test-id="metric-cost-per-task"
      />
      <MetricCard
        :label="$t('efficiency.messagesPerHour')"
        :value="messagesPerActiveHour"
        :subtitle="$t('efficiency.messagesPerHourSubtitle')"
        test-id="metric-msg-per-hour"
      />
      <MetricCard
        :label="$t('efficiency.changedFiles')"
        :value="filesChanged"
        :subtitle="$t('efficiency.changedFilesSubtitle')"
        test-id="metric-files-changed"
      />
    </div>

    <!-- Working Hour Heatmap -->
    <div class="chart-card" data-testid="heatmap-section">
      <div class="chart-card-header">
        <span class="chart-card-title">{{ $t('efficiency.workHoursDistribution') }}</span>
        <span class="chart-card-subtitle">{{ $t('efficiency.workHoursSubtitle') }}</span>
      </div>
      <HeatmapChart
        :data="heatmapData"
        :day-labels="dayLabels"
        height="280px"
        :min-color="resolvedTheme === 'dark' ? HEATMAP_COLORS_DARK[0] : HEATMAP_COLORS_LIGHT[0]"
        :max-color="resolvedTheme === 'dark' ? HEATMAP_COLORS_DARK[1] : HEATMAP_COLORS_LIGHT[1]"
      />
    </div>

    <!-- Timeline Tokens + Cost -->
    <div class="chart-card" data-testid="timeline-tokens-section">
      <div class="chart-card-header">
        <span class="chart-card-title">{{ $t('efficiency.tokenCostTrend') }}</span>
        <span class="chart-card-subtitle">{{ $t('efficiency.tokenCostTrendSubtitle') }}</span>
      </div>
      <div
        v-if="timelineLegendItems.length > 1"
        class="shared-legend"
      >
        <button
          v-for="item in timelineLegendItems"
          :key="item.name"
          type="button"
          class="legend-item"
          :class="{ 'legend-item--hidden': hiddenTimelineModels.has(item.name) }"
          :aria-pressed="!hiddenTimelineModels.has(item.name)"
          @click="toggleTimelineModel(item.name)"
        >
          <span
            class="legend-dot"
            :style="{ backgroundColor: item.color }"
          />
          {{ item.name }}
        </button>
      </div>
      <LineChart
        :x-data="timelineLabels"
        :series="filteredTimelineTokenSeries"
        height="260px"
        y-label="Token"
        :right-y-label="$t('efficiency.costLabel')"
        :value-formatter="formatTokens"
        :right-value-formatter="formatCost"
        :tooltip-formatter="tokenCostTooltipFormatter"
      />
    </div>

    <!-- Code Changes -->
    <div class="chart-card" data-testid="code-changes-section">
      <div class="chart-card-header">
        <span class="chart-card-title">{{ $t('efficiency.codeChangeTrend') }}</span>
        <span class="chart-card-subtitle">{{ $t('efficiency.codeChangeTrendSubtitle') }}</span>
      </div>
      <div
        v-if="codeChangesLegendItems.length > 1"
        class="shared-legend"
      >
        <button
          v-for="item in codeChangesLegendItems"
          :key="item.name"
          type="button"
          class="legend-item"
          :class="{ 'legend-item--hidden': hiddenCodeChangesModels.has(item.name) }"
          :aria-pressed="!hiddenCodeChangesModels.has(item.name)"
          @click="toggleCodeChangeModel(item.name)"
        >
          <span
            class="legend-dot"
            :style="{ backgroundColor: item.color }"
          />
          {{ item.name }}
        </button>
      </div>
      <LineChart
        :x-data="timelineLabels"
        :series="filteredCodeChangesSeries"
        height="260px"
        :show-area="true"
        :smooth="true"
        :y-label="$t('efficiency.lineCount')"
        :right-y-label="$t('efficiency.seriesFilesChanged')"
      />
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { DashboardEfficiencyHeatmapPoint } from "@/api/client";
import HeatmapChart from "@/charts/HeatmapChart.vue";
import LineChart from "@/charts/LineChart.vue";
import EmptyState from "@/components/EmptyState.vue";
import LoadingState from "@/components/LoadingState.vue";
import MetricCard from "@/components/MetricCard.vue";
import TimeRangePicker from "@/components/TimeRangePicker.vue";
import { useTheme } from "@/composables/useTheme";
import { useEfficiencyStore } from "@/stores/efficiency";
import {
  getChartColors,
  HEATMAP_COLORS_DARK,
  HEATMAP_COLORS_LIGHT,
} from "@/utils/chartColors";
import {
  createDurationI18n,
  formatCost,
  formatDuration,
  formatTokens,
} from "@/utils/format";
import {
  formatBucketLocal,
  getRangeMs,
  type TimeRange,
} from "@/utils/timezone";

// ── Store ───────────────────────────────────────────────────────────
const { efficiencyData, loading, error, lastFetchedAt, fetchEfficiency } =
  useEfficiencyStore();

const { t } = useI18n();

// ── Theme-aware chart colors ───────────────────────────────────────
const { resolvedTheme } = useTheme();
const chartColors = computed(() => getChartColors(resolvedTheme.value));

// ── State ──────────────────────────────────────────────────────────

const STALE_THRESHOLD_MS = 60_000;

const selectedPeriod = ref<TimeRange>("7d");

// ── Data Fetching ──────────────────────────────────────────────────

function fetchData(): void {
  const { start, end } = getRangeMs(selectedPeriod.value);
  void fetchEfficiency(start, end, { range: selectedPeriod.value });
}

// Initial load
onMounted(() => {
  fetchData();
});

// Re-fetch on activation if stale (>60s)
onActivated(() => {
  if (
    !lastFetchedAt.value ||
    Date.now() - lastFetchedAt.value > STALE_THRESHOLD_MS
  ) {
    fetchData();
  }
});

// User-initiated period change → refetch
watch(selectedPeriod, () => {
  hiddenTimelineModels.value = new Set();
  hiddenCodeChangesModels.value = new Set();
  fetchData();
});

// ── Formatting Helpers ─────────────────────────────────────────────

const efficiencyDurationI18n = createDurationI18n(t, {
  sec: "efficiency.durationMinutes",
  minSec: "efficiency.durationMinutes",
  hourMin: "efficiency.durationHoursMin",
  minutes: "efficiency.durationMinutes",
  hours: "efficiency.durationHours",
  hoursMin: "efficiency.durationHoursMin",
});

function formatEfficiencyDuration(ms: number | null | undefined): string {
  return formatDuration(ms, { precision: "min", i18n: efficiencyDurationI18n });
}

function formatRate(value: number | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)}`;
}

// ── Efficiency Metrics ─────────────────────────────────────────────

const summary = computed(() => efficiencyData.value?.summary ?? null);

const avgSessionDuration = computed(() => {
  if (!summary.value) return "—";
  return formatEfficiencyDuration(summary.value.avg_session_duration_ms);
});

const costPerSession = computed(() => {
  if (!summary.value) return "—";
  return formatCost(summary.value.avg_cost_per_session, 3);
});

const messagesPerActiveHour = computed(() => {
  if (!summary.value) return "—";
  return formatRate(summary.value.messages_per_active_hour);
});

const filesChanged = computed(() => {
  if (!summary.value) return "—";
  return summary.value.total_files_changed.toLocaleString();
});

// ── Working Hour Heatmap ───────────────────────────────────────────

const dayLabels = computed(() => [
  t("components.monday"),
  t("components.tuesday"),
  t("components.wednesday"),
  t("components.thursday"),
  t("components.friday"),
  t("components.saturday"),
  t("components.sunday"),
]);

function mapHeatmapPoint(p: DashboardEfficiencyHeatmapPoint): {
  day: number;
  hour: number;
  value: number;
} {
  // API weekday: 0=Sunday (SQLite strftime('%w')), 6=Saturday
  // Chart day: 0=Monday, 6=Sunday
  const day = p.weekday === 0 ? 6 : p.weekday - 1;
  return { day, hour: p.hour, value: p.messages };
}

const heatmapData = computed(() => {
  if (!efficiencyData.value) return [];
  return efficiencyData.value.heatmap.map(mapHeatmapPoint);
});

// ── Timeline Charts ────────────────────────────────────────────────

const timelineLabels = computed(() => {
  if (!efficiencyData.value) return [];
  return efficiencyData.value.timeline.map((p) => formatBucketLocal(p.bucket));
});

const timelineTokenSeries = computed(() => {
  if (!efficiencyData.value) return [];
  return [
    {
      name: "Token",
      data: efficiencyData.value.timeline.map((p) => p.tokens),
      color: chartColors.value[0],
    },
    {
      name: t("efficiency.seriesCost"),
      data: efficiencyData.value.timeline.map((p) =>
        Number((p.cost_usd ?? 0).toFixed(4)),
      ),
      color: chartColors.value[1],
      yAxisIndex: 1,
    },
  ];
});

const tokenCostTooltipFormatter = (params: unknown): string => {
  const list = params as Array<{
    axisValueLabel: string;
    seriesName: string;
    value: number;
    color: string;
  }>;
  if (!Array.isArray(list) || list.length === 0) return "";
  const header = list[0].axisValueLabel ?? "";
  const lines = list.map((p) => {
    const formatted =
      p.seriesName === "Token" ? formatTokens(p.value) : formatCost(p.value);
    return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>${p.seriesName}: <b>${formatted}</b>`;
  });
  return `<div style="font-size:12px">${header ? `<div style="margin-bottom:4px">${header}</div>` : ""}${lines.join("<br>")}</div>`;
};

// ── Legend Toggle State ──────────────────────────────────────────────
const hiddenTimelineModels = ref<Set<string>>(new Set());
const hiddenCodeChangesModels = ref<Set<string>>(new Set());

const timelineLegendItems = computed(() =>
  timelineTokenSeries.value.map((s) => ({ name: s.name, color: s.color })),
);
const codeChangesLegendItems = computed(() =>
  codeChangesSeries.value.map((s) => ({ name: s.name, color: s.color })),
);

const filteredTimelineTokenSeries = computed(() =>
  timelineTokenSeries.value.filter(
    (s) => !hiddenTimelineModels.value.has(s.name),
  ),
);
const filteredCodeChangesSeries = computed(() =>
  codeChangesSeries.value.filter(
    (s) => !hiddenCodeChangesModels.value.has(s.name),
  ),
);

function toggleTimelineModel(name: string): void {
  const next = new Set(hiddenTimelineModels.value);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  hiddenTimelineModels.value = next;
}

function toggleCodeChangeModel(name: string): void {
  const next = new Set(hiddenCodeChangesModels.value);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  hiddenCodeChangesModels.value = next;
}

// ── Code Changes ───────────────────────────────────────────────────

const codeChangesSeries = computed(() => {
  if (!efficiencyData.value) return [];
  return [
    {
      name: t("efficiency.seriesLinesAdded"),
      data: efficiencyData.value.timeline.map((p) => p.lines_added),
      color: chartColors.value[0],
    },
    {
      name: t("efficiency.seriesLinesDeleted"),
      data: efficiencyData.value.timeline.map((p) => p.lines_deleted),
      color: chartColors.value[1],
    },
    {
      name: t("efficiency.seriesFilesChanged"),
      data: efficiencyData.value.timeline.map((p) => p.files_changed),
      color: chartColors.value[2],
    },
  ];
});
</script>

<style scoped>
.view-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* ── Header ───────────────────────────────────────────────────────── */

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.view-title {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--text);
}

/* ── Metrics Grid ─────────────────────────────────────────────────── */

.metrics-grid {
  /* Grid handled by .resp-metrics-4 utility */
  gap: var(--spacing-3);
}

/* ── Chart Cards ──────────────────────────────────────────────────── */

.chart-card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.chart-card-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.chart-card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text);
}

.chart-card-subtitle {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* ── Shared Legend ──────────────────────────────────────────────────── */

.shared-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2) var(--spacing-3);
  justify-content: center;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--text-muted);
  white-space: nowrap;
  border: none;
  background: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: var(--radius-sm);
  transition: opacity 0.15s ease;
}

.legend-item:hover {
  opacity: 0.8;
}

.legend-item--hidden {
  opacity: 0.35;
  text-decoration: line-through;
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Chart Row ────────────────────────────────────────────────────── */

.chart-row {
  /* Grid handled by .resp-two-col utility */
  gap: var(--spacing-3);
}

</style>
