<template>
  <div class="view-container" data-testid="tools-view">
    <!-- Header -->
    <div class="view-header resp-header">
      <h1 class="view-title">{{ $t('tools.title') }}</h1>
      <TimeRangePicker v-model="selectedPeriod" />
    </div>

    <!-- Loading State (initial no-data only) -->
    <LoadingState v-if="loading && !hasExistingData" :message="$t('tools.loading')" test-id="tools-loading" />

    <!-- Error State (no-data only; preserves content when data exists) -->
    <EmptyState
      v-else-if="error && !hasExistingData"
      variant="error"
      :title="$t('common.dataLoadFailed')"
      :description="error"
      :action-label="$t('common.retry')"
      test-id="tools-error"
      @action="retryFetch"
    />

    <!-- Content -->
    <template v-else>
    <!-- Summary Metrics -->
    <div class="metrics-grid resp-metrics-4" data-testid="tools-metrics">
      <div class="metric-tile">
        <div class="metric-value">{{ formatNumber(toolsData?.total_tool_calls ?? 0) }}</div>
        <div class="metric-label">{{ $t('tools.totalCalls') }}</div>
      </div>
      <div class="metric-tile">
        <div class="metric-value">{{ formatPercent(toolsData?.error_rate ?? 0) }}</div>
        <div class="metric-label">{{ $t('tools.errorRate') }}</div>
      </div>
      <div class="metric-tile">
        <div class="metric-value">{{ toolsData?.tools.length ?? 0 }}</div>
        <div class="metric-label">{{ $t('tools.toolTypes') }}</div>
      </div>
      <div class="metric-tile">
        <div class="metric-value">{{ formatNumber(toolsData?.failed_tool_calls ?? 0) }}</div>
        <div class="metric-label">{{ $t('tools.totalErrors') }}</div>
      </div>
    </div>

    <!-- Tool Usage Trend -->
    <section class="section" data-testid="tools-trend">
      <h2 class="section-title">{{ $t('tools.usageTrend') }}</h2>
      <div v-if="trendDisplayLabels.length === 0" class="chart-empty">
        {{ $t('tools.noTrendData') }}
      </div>
      <LineChart
        v-else
        :x-data="trendDisplayLabels"
        :series="trendSeries"
        height="280px"
        :smooth="true"
        :show-area="true"
        :y-label="$t('tools.yLabelCallCount')"
      />
    </section>

    <!-- Bottom Row: Error Distribution + Average Duration Overview -->
    <div class="bottom-row resp-two-col" data-testid="tools-charts">
      <!-- Error Distribution Pie -->
      <section class="section bottom-section">
        <h2 class="section-title">{{ $t('tools.errorDistribution') }}</h2>
        <div v-if="errorPieData.length === 0" class="chart-empty">
          {{ $t('tools.noErrorData') }}
        </div>
        <PieChart
          v-else
          :data="errorPieData"
          height="280px"
          :donut="true"
          :show-label="true"
        />
      </section>

      <!-- Average Duration Overview -->
      <section class="section bottom-section">
        <h2 class="section-title">{{ $t('tools.avgDurationOverview') }}</h2>
        <div v-if="durationHistData.length === 0" class="chart-empty">
          {{ $t('tools.noDurationData') }}
        </div>
        <BarChart
          v-else
          :x-data="durationLabels"
          :series="durationSeries"
          height="280px"
          :y-label="$t('tools.yLabelToolCount')"
        />
      </section>
    </div>

    <!-- Tool Ranking Table -->
    <section class="section" data-testid="tools-ranking">
      <h2 class="section-title">{{ $t('tools.usageRanking') }}</h2>
      <div class="table-wrapper resp-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="sortable" :class="{ sorted: sortKey === 'tool_name' }" @click="toggleSort('tool_name')">
                {{ $t('tools.colToolName') }} <span class="sort-indicator">{{ sortIndicator('tool_name') }}</span>
              </th>
              <th class="sortable col-right" :class="{ sorted: sortKey === 'call_count' }" @click="toggleSort('call_count')">
                {{ $t('tools.colCallCount') }} <span class="sort-indicator">{{ sortIndicator('call_count') }}</span>
              </th>
              <th class="sortable col-right" :class="{ sorted: sortKey === 'error_rate' }" @click="toggleSort('error_rate')">
                {{ $t('tools.colErrorRate') }} <span class="sort-indicator">{{ sortIndicator('error_rate') }}</span>
              </th>
              <th class="sortable col-right" :class="{ sorted: sortKey === 'avg_duration_ms' }" @click="toggleSort('avg_duration_ms')">
                {{ $t('tools.colAvgDuration') }} <span class="sort-indicator">{{ sortIndicator('avg_duration_ms') }}</span>
              </th>
              <th class="col-right">
                {{ $t('tools.colDurationRange') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="sortedTools.length === 0">
              <td colspan="5">
                <EmptyState
                  :title="$t('tools.noCallData')"
                  :description="$t('tools.noCallDataDesc')"
                  test-id="tools-empty"
                />
              </td>
            </tr>
            <tr v-for="tool in sortedTools" :key="tool.tool_name">
              <td class="col-monospace">{{ tool.tool_name }}</td>
              <td class="col-right">{{ formatNumber(tool.call_count) }}</td>
              <td class="col-right">
                <span :class="rateClass(tool.error_rate ?? 0)">{{ formatPercent(tool.error_rate ?? 0) }}</span>
              </td>
              <td class="col-right">{{ formatDuration(tool.avg_duration_ms ?? 0) }}</td>
              <td class="col-right col-muted">{{ formatDuration(tool.min_duration_ms ?? 0) }} – {{ formatDuration(tool.max_duration_ms ?? 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Recent Errors -->
    <section class="section" data-testid="tools-recent-errors">
      <div class="section-header">
        <h2 class="section-title">{{ $t('tools.recentErrors') }}</h2>
        <span class="section-subtitle">{{ $t('tools.recentErrorsSubtitle') }}</span>
      </div>
      <div v-if="recentErrors.length === 0" class="chart-empty">
        {{ $t('tools.noRecentErrors') }}
      </div>
      <div v-else class="table-wrapper resp-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ $t('tools.colTool') }}</th>
              <th>{{ $t('tools.colSession') }}</th>
              <th>{{ $t('tools.colErrorMessage') }}</th>
              <th>{{ $t('tools.colDuration') }}</th>
              <th>{{ $t('tools.colTime') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="err in recentErrors" :key="err.call_id">
              <td class="col-monospace">{{ err.tool_name }}</td>
              <td class="col-monospace">{{ truncateId(err.session_id) }}</td>
              <td class="col-error-msg">{{ err.error_message }}</td>
              <td class="col-right">{{ formatDuration(err.duration_ms ?? 0) }}</td>
              <td class="col-right">{{ formatTimestampShort(err.completed_at_ms ?? err.started_at_ms) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type {
  DashboardToolItem,
  DashboardToolTimelinePoint,
} from "@/api/client";
import BarChart from "@/charts/BarChart.vue";
import LineChart from "@/charts/LineChart.vue";
import PieChart from "@/charts/PieChart.vue";
import EmptyState from "@/components/EmptyState.vue";
import LoadingState from "@/components/LoadingState.vue";
import TimeRangePicker from "@/components/TimeRangePicker.vue";
import { useTheme } from "@/composables/useTheme";
import { useToolsStore } from "@/stores/tools";
import { getChartColors } from "@/utils/chartColors";
import { formatDuration, formatNumber, formatPercent } from "@/utils/format";
import {
  formatBucketLocal,
  formatTimestampShort,
  getRangeMs,
  type TimeRange,
} from "@/utils/timezone";
import { truncateId } from "@/utils/truncate";

// ── Store ──────────────────────────────────────────────────────────

const store = useToolsStore();
const { t } = useI18n();

// ── Theme-aware chart colors ───────────────────────────────────────
const { resolvedTheme } = useTheme();
const chartColors = computed(() => getChartColors(resolvedTheme.value));

const selectedPeriod = ref<TimeRange>("7d");

// ── Data from Store ────────────────────────────────────────────────

const loading = computed(() => store.loading.value);
const error = computed(() => store.error.value);
const hasExistingData = computed(() => store.toolCalls.value.length > 0);
const toolsData = computed(() => {
  const summary = store.toolSummary.value;
  return {
    tools: store.toolCalls.value,
    total_tool_calls: summary?.total_tool_calls ?? 0,
    failed_tool_calls: summary?.failed_tool_calls ?? 0,
    error_rate: summary?.tool_error_rate ?? 0,
  };
});
const recentErrors = computed(() => store.toolRecentErrors.value);

// ── Lifecycle ──────────────────────────────────────────────────────

const STALE_MS = 60_000;

function fetchData(): void {
  const { start, end } = getRangeMs(selectedPeriod.value);
  void store.fetchTools(start, end, { range: selectedPeriod.value });
}

function retryFetch(): void {
  fetchData();
}

onMounted(() => {
  fetchData();
});

onActivated(() => {
  if (
    store.lastFetchedAt.value != null &&
    Date.now() - store.lastFetchedAt.value < STALE_MS
  ) {
    return;
  }
  fetchData();
});

watch(selectedPeriod, () => {
  fetchData();
});

// ── Sorting ──────────────────────────────────────────────────────────

type SortKey = keyof DashboardToolItem;
const sortKey = ref<SortKey>("call_count");
const sortDir = ref<"asc" | "desc">("desc");

function toggleSort(key: SortKey): void {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value = key === "tool_name" ? "asc" : "desc";
  }
}

function sortIndicator(key: SortKey): string {
  if (sortKey.value !== key) return "↕";
  return sortDir.value === "asc" ? "↑" : "↓";
}

const sortedTools = computed<DashboardToolItem[]>(() => {
  const tools = toolsData.value?.tools ?? [];
  const sorted = [...tools].sort((a, b) => {
    const aVal = a[sortKey.value];
    const bVal = b[sortKey.value];
    let cmp = 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal).localeCompare(String(bVal));
    }
    return sortDir.value === "asc" ? cmp : -cmp;
  });
  return sorted;
});

// ── Trend Chart Data (from tools timeline, aggregated by date) ──────

const trendLabels = computed(() => {
  const dates = new Set(
    store.toolTimeline.value.map((p: DashboardToolTimelinePoint) => p.date),
  );
  return [...dates].sort();
});

const trendDisplayLabels = computed(() =>
  trendLabels.value.map(formatBucketLocal),
);

const trendSeries = computed(() => {
  const labels = trendLabels.value;
  const callMap = new Map<string, number>();
  const failMap = new Map<string, number>();
  for (const p of store.toolTimeline.value) {
    callMap.set(p.date, (callMap.get(p.date) ?? 0) + p.call_count);
    failMap.set(p.date, (failMap.get(p.date) ?? 0) + p.failed_count);
  }
  return [
    {
      name: t("tools.seriesToolCalls"),
      data: labels.map((d) => callMap.get(d) ?? 0),
      color: chartColors.value[0],
    },
    {
      name: t("tools.seriesFailedCalls"),
      data: labels.map((d) => failMap.get(d) ?? 0),
      color: chartColors.value[1],
    },
  ];
});

// ── Error Pie Data ───────────────────────────────────────────────────

const errorPieData = computed(() => {
  const tools = toolsData.value?.tools ?? [];
  return tools
    .filter((t) => t.failed_count > 0)
    .map((t) => ({
      name: t.tool_name,
      value: t.failed_count,
    }))
    .sort((a, b) => b.value - a.value);
});

// ── Duration Histogram Data ──────────────────────────────────────────

interface DurationBucket {
  label: string;
  count: number;
}

const durationHistData = computed<DurationBucket[]>(() => {
  const tools = toolsData.value?.tools ?? [];
  if (tools.length === 0) return [];

  // Create duration buckets: <100ms, 100-500ms, 500ms-1s, 1-5s, 5-10s, 10s+
  const buckets: DurationBucket[] = [
    { label: "<100ms", count: 0 },
    { label: "100-500ms", count: 0 },
    { label: "0.5-1s", count: 0 },
    { label: "1-5s", count: 0 },
    { label: "5-10s", count: 0 },
    { label: ">10s", count: 0 },
  ];

  for (const tool of tools) {
    const ms = tool.avg_duration_ms;
    if (ms == null) continue;
    if (ms < 100) buckets[0].count++;
    else if (ms < 500) buckets[1].count++;
    else if (ms < 1000) buckets[2].count++;
    else if (ms < 5000) buckets[3].count++;
    else if (ms < 10000) buckets[4].count++;
    else buckets[5].count++;
  }

  return buckets;
});

const durationLabels = computed(() =>
  durationHistData.value.map((b) => b.label),
);
const durationSeries = computed(() => [
  {
    name: t("tools.seriesToolCount"),
    data: durationHistData.value.map((b) => b.count),
    color: chartColors.value[0],
  },
]);

// ── Formatters ───────────────────────────────────────────────────────

function rateClass(errorRate: number): string {
  if (errorRate <= 0.05) return "rate-good";
  if (errorRate <= 0.2) return "rate-warn";
  return "rate-bad";
}
</script>

<style scoped>
/* ── View Container ─────────────────────────────────────────────────── */
.view-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

/* ── View Header ────────────────────────────────────────────────────── */
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
  gap: var(--spacing-2);
}

.metric-tile {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacing-3) var(--spacing-2);
  text-align: center;
  min-width: 0;
  overflow: hidden;
}

.metric-value {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Section ────────────────────────────────────────────────────────── */
.section {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text);
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.section-subtitle {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* ── Data Table ─────────────────────────────────────────────────────── */
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-base);
}

.data-table thead {
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-table th {
  padding: var(--spacing-2) var(--spacing-3);
  text-align: center;
  font-weight: 500;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  user-select: none;
}

.data-table th.sortable {
  cursor: pointer;
  transition: color 0.15s ease;
}

.data-table th.sortable:hover {
  color: var(--text);
}

.data-table th.sorted {
  color: var(--primary);
}

.sort-indicator {
  font-size: var(--text-xs);
  margin-left: var(--spacing-1);
  opacity: 0.6;
}

.data-table td {
  padding: var(--spacing-2) var(--spacing-3);
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: middle;
  text-align: center;
}

.data-table tbody tr {
  transition: background-color 0.1s ease;
}

.data-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.col-right {
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.col-monospace {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: var(--text-sm);
}

.col-muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.col-error-msg {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
  color: var(--danger);
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: var(--spacing-6) !important;
  font-style: italic;
}

/* ── Rate Colors ────────────────────────────────────────────────────── */
.rate-good {
  color: var(--success);
}

.rate-warn {
  color: var(--warning);
}

.rate-bad {
  color: var(--danger);
}

/* ── Bottom Row ─────────────────────────────────────────────────────── */
.bottom-row {
  /* Grid handled by .resp-two-col utility */
  gap: var(--spacing-3);
}

.bottom-section {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
}

/* ── Chart Empty ────────────────────────────────────────────────────── */
.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 280px;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

</style>
