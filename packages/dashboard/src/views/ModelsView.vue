<template>
  <div class="view-container" data-testid="models-view">
    <!-- Header -->
    <div class="view-header resp-header">
      <h1 class="view-title">{{ $t('models.title') }}</h1>
      <TimeRangePicker v-model="selectedPeriod" />
    </div>

    <!-- Loading State (initial no-data only) -->
    <LoadingState v-if="store.loading.value && store.models.value.length === 0" :message="$t('models.loading')" test-id="models-loading" />

    <!-- Error State (no-data only; preserves content when data exists) -->
    <EmptyState
      v-else-if="store.error.value && store.models.value.length === 0"
      variant="error"
      :title="$t('common.dataLoadFailed')"
      :description="store.error.value"
      :action-label="$t('common.retry')"
      test-id="models-error"
      @action="retry"
    />

    <!-- Content -->
    <template v-else>
    <!-- Model Comparison Table -->
    <div class="table-wrapper resp-table-wrapper" data-testid="models-table-wrapper">
      <table class="data-table" data-testid="models-table">
        <thead>
          <tr>
            <th class="col-sortable" @click="toggleSort('model')">
              {{ $t('models.colModel') }} <span class="sort-arrow">{{ sortIndicator('model') }}</span>
            </th>
            <th class="col-sortable col-right" @click="toggleSort('session_count')">
              {{ $t('models.colSessionCount') }} <span class="sort-arrow">{{ sortIndicator('session_count') }}</span>
            </th>
            <th class="col-sortable col-right" @click="toggleSort('message_count')">
              {{ $t('models.colMessageCount') }} <span class="sort-arrow">{{ sortIndicator('message_count') }}</span>
            </th>
            <th class="col-sortable col-right col-token-start" @click="toggleSort('total_tokens')">
              {{ $t('models.colTotalToken') }} <span class="sort-arrow">{{ sortIndicator('total_tokens') }}</span>
            </th>
            <th class="col-sortable col-right" @click="toggleSort('input_tokens')">
              {{ $t('models.colInputToken') }} <span class="sort-arrow">{{ sortIndicator('input_tokens') }}</span>
            </th>
            <th class="col-sortable col-right" @click="toggleSort('output_tokens')">
              {{ $t('models.colOutputToken') }} <span class="sort-arrow">{{ sortIndicator('output_tokens') }}</span>
            </th>
            <th class="col-sortable col-right" @click="toggleSort('cache_read')">
              {{ $t('models.colCacheRead') }} <span class="sort-arrow">{{ sortIndicator('cache_read') }}</span>
            </th>
            <th class="col-sortable col-right" @click="toggleSort('cache_write')">
              {{ $t('models.colCacheWrite') }} <span class="sort-arrow">{{ sortIndicator('cache_write') }}</span>
            </th>
            <th class="col-sortable col-right col-token-end" @click="toggleSort('reasoning_tokens')">
              {{ $t('models.colReasoning') }} <span class="sort-arrow">{{ sortIndicator('reasoning_tokens') }}</span>
            </th>
            <th class="col-sortable col-right" @click="toggleSort('cost_usd')">
              {{ $t('models.colCost') }} <span class="sort-arrow">{{ sortIndicator('cost_usd') }}</span>
            </th>
            <th class="col-sortable col-right" @click="toggleSort('avg_cost_per_message')">
              {{ $t('models.colAvgCost') }} <span class="sort-arrow">{{ sortIndicator('avg_cost_per_message') }}</span>
            </th>
            <th class="col-sortable col-right" @click="toggleSort('error_count')">
              <span :title="$t('models.messageErrorRateTip')">{{ $t('models.messageErrorRate') }}</span> <span class="sort-arrow">{{ sortIndicator('error_count') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="sortedModels.length === 0">
            <td colspan="12" class="empty-row">{{ $t('models.noData') }}</td>
          </tr>
          <tr v-for="m in sortedModels" :key="m.model" :data-testid="`model-row-${m.model}`">
            <td class="col-monospace">{{ m.model }}</td>
            <td class="col-right">{{ formatNumber(m.session_count) }}</td>
            <td class="col-right">{{ formatNumber(m.message_count) }}</td>
            <td class="col-right col-token-start">{{ formatTokens(m.total_tokens) }}</td>
            <td class="col-right">{{ formatTokens(m.input_tokens) }}</td>
            <td class="col-right">{{ formatTokens(m.output_tokens) }}</td>
            <td class="col-right">{{ formatTokens(m.cache_read) }}</td>
            <td class="col-right">{{ formatTokens(m.cache_write) }}</td>
            <td class="col-right col-token-end">{{ formatTokens(m.reasoning_tokens) }}</td>
            <td class="col-right">{{ formatCost(m.cost_usd) }}</td>
            <td class="col-right">{{ formatCost(m.avg_cost_per_message ?? 0) }}</td>
            <td class="col-right">
              <span 
                class="error-rate clickable" 
                :class="errorRateClass(m)"
                @click="openErrorDetail(m)"
              >
                {{ formatErrorRate(m) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Charts Row 1: Token + Message/Session side by side -->
    <div class="charts-grid resp-two-col">
      <!-- Token Breakdown (Stacked Bar) -->
      <div class="chart-card" data-testid="token-breakdown-chart">
        <div class="chart-card-header">
          <h3 class="chart-card-title">{{ $t('models.tokenBreakdown') }}</h3>
          <span class="chart-card-subtitle">{{ $t('models.tokenBreakdownSubtitle') }}</span>
        </div>
        <BarChart
          :x-data="tokenChartLabels"
          :series="tokenChartSeries"
          :stacked="true"
          height="280px"
          y-label="Token"
          :value-formatter="formatTokens"
        />
      </div>

      <!-- Message/Session Comparison (Dual-Axis Bar) -->
      <div class="chart-card" data-testid="message-session-chart">
        <div class="chart-card-header">
          <h3 class="chart-card-title">{{ $t('models.messageSessionComparison') }}</h3>
          <span class="chart-card-subtitle">{{ $t('models.messageSessionSubtitle') }}</span>
        </div>
        <BarChart
          :x-data="messageSessionChartLabels"
          :series="messageSessionChartSeries"
          height="280px"
          :y-label="$t('models.yLabelSessions')"
          :right-y-label="$t('models.yLabelMessages')"
          :value-formatter="formatNumber"
          :right-value-formatter="formatNumber"
        />
      </div>
    </div>

    <!-- Charts Row 2: Cost Comparison (full width) -->
    <div class="chart-card chart-card-full" data-testid="cost-trend-chart">
      <div class="chart-card-header">
        <h3 class="chart-card-title">{{ $t('models.costComparison') }}</h3>
        <span class="chart-card-subtitle">{{ $t('models.costComparisonSubtitle') }}</span>
      </div>
      <BarChart
        :x-data="costChartLabels"
        :series="costChartSeries"
        height="280px"
        y-label="USD"
        :value-formatter="formatCost"
      />
    </div>

    <!-- Charts Row 3: Cost-Performance Scatter (full width) -->
    <div class="chart-card chart-card-full" data-testid="cost-performance-chart">
      <div class="chart-card-header">
        <h3 class="chart-card-title">{{ $t('models.valueAnalysis') }}</h3>
        <span class="chart-card-subtitle">{{ $t('models.valueAnalysisSubtitle') }}</span>
      </div>
      <ScatterChart
        :data="scatterData"
        :x-label="$t('models.xLabelCost')"
        :y-label="$t('models.yLabelOutputToken')"
        height="300px"
        :x-value-formatter="formatCost"
        :y-value-formatter="formatTokens"
      />
    </div>

    <!-- Error Detail Drawer -->
    <div
      v-if="selectedModelError !== null || errorDetailLoading || errorDetailError"
      class="detail-drawer-shell"
      data-testid="error-detail-drawer"
    >
      <button
        class="detail-backdrop"
        type="button"
        @click="closeErrorDetail"
      />
      <aside class="detail-drawer">
        <div v-if="errorDetailLoading" class="detail-loading" data-testid="error-detail-loading">
          {{ $t('models.errorDetailLoading') }}
        </div>
        <div v-else-if="errorDetailError" class="detail-loading" data-testid="error-detail-error">
          <p class="detail-error-message">{{ errorDetailError }}</p>
        </div>
        <template v-else-if="selectedModelError">
          <div class="detail-header">
            <h2 class="detail-title">
              {{ $t('models.errorDetailTitle') }}
              <code class="detail-model">{{ selectedModelError.model }}</code>
            </h2>
            <button class="btn btn-ghost btn-sm" @click="closeErrorDetail">
              {{ $t('models.close') }}
            </button>
          </div>

          <!-- Error Summary -->
          <div class="detail-section">
            <div class="detail-grid">
              <div class="detail-item">
                <span class="detail-label">{{ $t('models.messageErrorRate') }}</span>
                <span class="detail-value">{{ formatErrorRate(selectedModelError) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">{{ $t('models.messageErrorRate') }}</span>
                <span class="detail-value">{{ selectedModelError.error_count }}</span>
              </div>
            </div>
          </div>

          <!-- Error Detail Table -->
          <div class="detail-section">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th class="col-error-message">{{ $t('models.colErrorMessage') }}</th>
                    <th>{{ $t('models.colErrorTime') }}</th>
                    <th>{{ $t('models.colErrorDuration') }}</th>
                    <th>{{ $t('models.colErrorTokens') }}</th>
                    <th>{{ $t('models.colErrorSession') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="error in selectedModelError.errors" :key="error.message_id">
                    <td class="col-error-message">
                      <span class="error-type-badge">{{ error.error_type ?? '—' }}</span>
                      <span v-if="error.error_message" class="error-message-text">
                        {{ error.error_message }}
                      </span>
                    </td>
                    <td>{{ formatTimestamp(error.created_at_ms) }}</td>
                    <td>{{ formatDuration(error.duration_ms) }}</td>
                    <td>{{ formatTokens(error.total_tokens) }}</td>
                    <td class="col-monospace">{{ truncateSessionId(error.session_id) }}</td>
                  </tr>
                  <tr v-if="selectedModelError.errors.length === 0">
                    <td colspan="5" class="empty-row">{{ $t('models.noErrors') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </aside>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type {
  DashboardModelErrorDetail,
  DashboardModelItem,
} from "@/api/client";
import { fetchModelErrorDetail } from "@/api/client";
import BarChart from "@/charts/BarChart.vue";
import ScatterChart from "@/charts/ScatterChart.vue";
import EmptyState from "@/components/EmptyState.vue";
import LoadingState from "@/components/LoadingState.vue";
import TimeRangePicker from "@/components/TimeRangePicker.vue";
import { useTheme } from "@/composables/useTheme";
import { useModelsStore } from "@/stores/models";
import { getChartColors } from "@/utils/chartColors";
import {
  formatCost,
  formatDuration,
  formatNumber,
  formatPercent,
  formatTokens,
} from "@/utils/format";
import {
  formatBucketLocal,
  formatRelativeTimeFromDate,
  getRangeMs,
  type TimeRange,
} from "@/utils/timezone";
import { truncateSessionId } from "@/utils/truncate";

// ── Store ──────────────────────────────────────────────────────────────
const store = useModelsStore();
const { t } = useI18n();

const STALE_MS = 60_000;

// ── Time Range ─────────────────────────────────────────────────────────
const selectedPeriod = ref<TimeRange>("7d");

function fetchCurrentPeriod(): void {
  const { start, end } = getRangeMs(selectedPeriod.value);
  void store.fetchModels(start, end, { range: selectedPeriod.value });
}

function retry(): void {
  fetchCurrentPeriod();
}

watch(selectedPeriod, () => fetchCurrentPeriod());

onMounted(() => {
  if (store.models.value.length === 0) fetchCurrentPeriod();
});

onActivated(() => {
  const age = store.lastFetchedAt.value;
  if (age === null || Date.now() - age > STALE_MS) fetchCurrentPeriod();
});

// ── Sort State ─────────────────────────────────────────────────────────
type SortKey = keyof DashboardModelItem;
const sortKey = ref<SortKey | null>(null);
const sortAsc = ref(true);

function toggleSort(key: SortKey): void {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortKey.value = key;
    sortAsc.value = true;
  }
}

function sortIndicator(key: SortKey): string {
  if (sortKey.value !== key) return "↕";
  return sortAsc.value ? "↑" : "↓";
}

// ── Computed: sorted models ────────────────────────────────────────────
const sortedModels = computed(() => {
  const data = [...store.models.value];
  if (!sortKey.value) return data;

  const key = sortKey.value;
  const dir = sortAsc.value ? 1 : -1;

  return data.sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (typeof va === "number" && typeof vb === "number")
      return (va - vb) * dir;
    return String(va).localeCompare(String(vb)) * dir;
  });
});

// ── Theme-aware chart colors ───────────────────────────────────────────
const { resolvedTheme } = useTheme();
const chartColors = computed(() => getChartColors(resolvedTheme.value));

// ── Error Detail Drawer ─────────────────────────────────────────────────
interface ModelWithError extends DashboardModelItem {
  errors: DashboardModelErrorDetail["errors"];
}

const selectedModelError = ref<ModelWithError | null>(null);
const errorDetailLoading = ref(false);
const errorDetailError = ref<string | null>(null);

async function openErrorDetail(model: DashboardModelItem): Promise<void> {
  if (model.error_count === 0) return;

  errorDetailLoading.value = true;
  errorDetailError.value = null;
  selectedModelError.value = null;

  try {
    const { start, end } = getRangeMs(selectedPeriod.value);
    const detail = await fetchModelErrorDetail(model.model, start, end);
    selectedModelError.value = {
      ...model,
      errors: detail.errors,
    };
  } catch (err) {
    console.error("Failed to fetch error detail:", err);
    errorDetailError.value = err instanceof Error ? err.message : String(err);
  } finally {
    errorDetailLoading.value = false;
  }
}

function closeErrorDetail(): void {
  selectedModelError.value = null;
  errorDetailError.value = null;
}

function formatTimestamp(ms: number): string {
  return formatRelativeTimeFromDate(new Date(ms));
}

const tokenChartLabels = computed(() => store.models.value.map((m) => m.model));

const tokenChartSeries = computed(() => [
  {
    name: "Input",
    data: store.models.value.map((m) => m.input_tokens),
    color: chartColors.value[0],
  },
  {
    name: "Output",
    data: store.models.value.map((m) => m.output_tokens),
    color: chartColors.value[1],
  },
  {
    name: "Cache Read",
    data: store.models.value.map((m) => m.cache_read),
    color: chartColors.value[2],
  },
  {
    name: "Cache Write",
    data: store.models.value.map((m) => m.cache_write),
    color: chartColors.value[3],
  },
  {
    name: "Reasoning",
    data: store.models.value.map((m) => m.reasoning_tokens),
    color: chartColors.value[4],
  },
]);

// ── Chart Data: Cost Trend ─────────────────────────────────────────────
const costTrendDates = computed(() => {
  const dates = new Set<string>();
  for (const p of store.modelsCostTrend.value) dates.add(p.date);
  return [...dates].sort();
});

const costChartLabels = computed(() =>
  costTrendDates.value.map(formatBucketLocal),
);

const costTrendModels = computed(() => {
  const models = new Set<string>();
  for (const p of store.modelsCostTrend.value) models.add(p.model);
  return [...models];
});

const costChartSeries = computed(() => {
  const dateSet = costTrendDates.value;
  return costTrendModels.value.map((model, i) => ({
    name: model,
    data: dateSet.map((d) => {
      const pt = store.modelsCostTrend.value.find(
        (p) => p.date === d && p.model === model,
      );
      return pt?.cost_usd ?? 0;
    }),
    color: chartColors.value[i % chartColors.value.length],
  }));
});

// ── Chart Data: Message/Session Comparison ────────────────────────────
const messageSessionChartLabels = computed(() =>
  [...store.models.value]
    .sort((a, b) => b.session_count - a.session_count)
    .slice(0, 8)
    .map((m) => m.model),
);

const messageSessionChartSeries = computed(() => {
  const top8 = [...store.models.value]
    .sort((a, b) => b.session_count - a.session_count)
    .slice(0, 8);
  return [
    {
      name: t("models.seriesSessions"),
      data: top8.map((m) => m.session_count),
      color: chartColors.value[0],
      yAxisIndex: 0,
    },
    {
      name: t("models.seriesMessages"),
      data: top8.map((m) => m.message_count),
      color: chartColors.value[1],
      yAxisIndex: 1,
    },
  ];
});

// ── Chart Data: Scatter (Cost vs Output) ───────────────────────────────
const scatterData = computed(() =>
  store.models.value.map((m) => ({
    name: m.model,
    x: m.cost_usd,
    y: m.output_tokens,
    size: Math.max(8, Math.min(30, m.session_count / 2)),
  })),
);

// ── Formatting Helpers ─────────────────────────────────────────────────
function formatErrorRate(m: DashboardModelItem): string {
  return formatPercent(m.error_rate);
}

function errorRateClass(m: DashboardModelItem): string {
  if (m.error_rate === null || m.error_rate === undefined) return "";
  const pct = m.error_rate * 100;
  if (pct >= 5) return "rate-high";
  if (pct >= 2) return "rate-medium";
  return "rate-low";
}
</script>

<style scoped>
/* ── View Container ─────────────────────────────────────────────────── */
.view-container {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-4);
}

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

/* ── Data Table ─────────────────────────────────────────────────────── */
.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-base);
}

.data-table th {
  padding: var(--spacing-2) var(--spacing-3);
  background-color: var(--surface);
  border-bottom: 1px solid var(--border);
  text-align: center;
  font-weight: 600;
  color: var(--text-muted);
  font-size: var(--text-sm);
  white-space: nowrap;
  user-select: none;
}

.data-table td {
  padding: var(--spacing-2) var(--spacing-3);
  border-bottom: 1px solid var(--border);
  color: var(--text);
  white-space: nowrap;
  text-align: center;
}

.data-table tbody tr:hover {
  background-color: var(--surface-hover);
}

.col-sortable {
  cursor: pointer;
}

.col-sortable:hover {
  color: var(--text);
}

.sort-arrow {
  font-size: var(--text-xs);
  opacity: 0.6;
}

.col-right {
  text-align: center;
}

.col-monospace {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: var(--text-sm);
}

/* ── Token Group Visual ─────────────────────────────────────────────── */
.col-token-start {
  border-left: 2px solid var(--primary);
}

.col-token-end {
  border-right: 2px solid var(--primary);
}

.empty-row {
  text-align: center;
  color: var(--text-muted);
  padding: var(--spacing-6) !important;
  font-style: italic;
}

/* ── Error Rate ─────────────────────────────────────────────────────── */
.error-rate {
  font-weight: 600;
  font-size: var(--text-sm);
}

.rate-low {
  color: var(--success);
}

.rate-medium {
  color: var(--warning);
}

.rate-high {
  color: var(--danger);
}

/* ── Charts Grid ────────────────────────────────────────────────────── */
.charts-grid {
  /* Grid handled by .resp-two-col utility */
  gap: var(--spacing-4);
}

.chart-card {
  background-color: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--spacing-4);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.chart-card-full {
  grid-column: 1 / -1;
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

/* ── Error Rate Clickable ────────────────────────────────────────────── */
.error-rate.clickable {
  cursor: pointer;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
}

.error-rate.clickable:hover {
  text-decoration-style: solid;
}

/* ── Detail Drawer ──────────────────────────────────────────────────── */
.detail-drawer-shell {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
}

.detail-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: var(--overlay-bg);
  cursor: pointer;
  pointer-events: auto;
}

.detail-drawer {
  position: absolute;
  top: 0;
  right: 0;
  width: min(960px, 90vw);
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
  overflow-y: auto;
  pointer-events: auto;
}

.detail-loading {
  padding: var(--spacing-6);
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
}

.detail-error-message {
  color: var(--error);
  margin: 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}

.detail-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text);
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
}

.detail-model {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: var(--text-sm);
  color: var(--primary);
  background: var(--primary-subtle);
  padding: 1px var(--spacing-2);
  border-radius: var(--radius-sm);
}

.detail-section {
  padding: var(--spacing-3) var(--spacing-4);
  border-bottom: 1px solid var(--border);
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-3);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-1);
}

.detail-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-value {
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--text);
}

/* ── Error Table ─────────────────────────────────────────────────────── */
.col-error-message {
  text-align: left;
  max-width: 400px;
}

.error-type-badge {
  display: inline-block;
  padding: 1px var(--spacing-2);
  background: var(--danger-subtle);
  color: var(--danger);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: 500;
  margin-right: var(--spacing-2);
}

.error-message-text {
  font-size: var(--text-sm);
  color: var(--text-muted);
  word-break: break-word;
}

.col-monospace {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: var(--text-xs);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2) var(--spacing-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-ghost {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.btn-ghost:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.btn-sm {
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--text-xs);
}

</style>
