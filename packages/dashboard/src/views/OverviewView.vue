<template>
    <div class="overview-container">
        <!-- Loading State (initial no-data only) -->
        <LoadingState
            v-if="loading && !overview"
            :message="$t('overview.loading')"
            test-id="overview-loading"
        />

        <!-- Error State (no-data only; preserves content when data exists) -->
        <EmptyState
            v-else-if="error && !overview"
            variant="error"
            :title="$t('common.dataLoadFailed')"
            :description="error"
            :action-label="$t('common.retry')"
            test-id="overview-error"
            @action="retryFetch"
        />

        <!-- Empty State -->
        <EmptyState
            v-else-if="!overview"
            :title="$t('overview.noStatsData')"
            :description="$t('common.noDataDesc')"
            test-id="overview-empty"
        />

        <!-- Content -->
        <template v-else>
            <!-- Page Header -->
            <div class="view-header resp-header">
                <h1 class="view-title">{{ $t('overview.title') }}</h1>
                <TimeRangePicker v-model="selectedPeriod" />
            </div>

            <!-- Metric Cards -->
            <div class="metrics-row resp-metrics-5" data-testid="metrics-row">
                <MetricCard
                    :label="$t('overview.totalSessions')"
                    :value="overview?.total_sessions ?? 0"
                    :secondary-label="$t('overview.totalMessages')"
                    :secondary-value="overview?.total_messages ?? 0"
                    :subtitle="$t('overview.sessionsSubtitle', { active: overview?.active_sessions ?? 0, deleted: overview?.deleted_sessions ?? 0 })"
                    test-id="metric-sessions"
                />
                <MetricCard
                    :label="$t('overview.totalTokens')"
                    :value="formatTokens(overview?.total_tokens ?? 0)"
                    :secondary-label="$t('common.cost')"
                    :secondary-value="formatCost(overview?.total_cost_usd ?? 0)"
                    :subtitle="$t('overview.tokensSubtitle', { input: formatTokens(overview?.input_tokens ?? 0), output: formatTokens(overview?.output_tokens ?? 0) })"
                    test-id="metric-tokens"
                />
                <MetricCard
                    :label="$t('overview.avgProjectTokens')"
                    :value="formatTokens(avgProjectTokens)"
                    :secondary-label="$t('common.cost')"
                    :secondary-value="formatCost(avgProjectCost)"
                    :subtitle="$t('overview.avgProjectSubtitle', { count: formatNumber(avgProjectMessages) })"
                    test-id="metric-avg-cost"
                />
                <MetricCard
                    :label="$t('overview.toolCalls')"
                    :value="overview?.total_tool_calls ?? 0"
                    :secondary-label="$t('overview.successRate')"
                    :secondary-value="`${toolSuccessRate}%`"
                    :subtitle="$t('overview.toolCallsSubtitle', { errors: overview?.total_tool_errors ?? 0 })"
                    test-id="metric-tools"
                />
                <MetricCard
                    :label="$t('overview.codeChanges')"
                    :value="
                        (
                            (overview?.lines_added ?? 0) -
                            (overview?.lines_deleted ?? 0)
                        ).toLocaleString()
                    "
                    :secondary-label="$t('overview.changedFiles')"
                    :secondary-value="overview?.files_changed ?? 0"
                    :subtitle="$t('overview.codeChangesSubtitle', { added: overview?.lines_added ?? 0, deleted: overview?.lines_deleted ?? 0 })"
                    test-id="metric-code"
                />
            </div>

            <!-- Usage Trend (dual y-axis: Token left, Messages right) -->
            <div class="trend-section" data-testid="trend-section">
                <h3 class="section-title">{{ $t('overview.usageTrend') }}</h3>
                <LineChart
                    :x-data="trendDates"
                    :series="trendSeries"
                    height="260px"
                    :smooth="true"
                    :show-area="true"
                    y-label="Token"
                    :value-formatter="formatTokens"
                    :right-y-label="$t('overview.messages')"
                    :right-value-formatter="formatNumber"
                />
            </div>

            <!-- Working Hour Heatmap -->
            <div class="chart-card" data-testid="working-hour-heatmap">
                <div class="chart-card-header">
                    <h3 class="chart-card-title">{{ $t('overview.workHoursDistribution') }}</h3>
                    <span class="chart-card-subtitle">{{ $t('overview.workHoursSubtitle') }}</span>
                </div>
                <HeatmapChart
                    :data="heatmapData"
                    :day-labels="dayLabels"
                    height="280px"
                    :min-color="resolvedTheme === 'dark' ? HEATMAP_COLORS_DARK[0] : HEATMAP_COLORS_LIGHT[0]"
                    :max-color="resolvedTheme === 'dark' ? HEATMAP_COLORS_DARK[1] : HEATMAP_COLORS_LIGHT[1]"
                />
            </div>

            <!-- Model Distribution: cost + messages in one card -->
            <div class="chart-card" data-testid="model-distribution">
                <div class="chart-card-header">
                    <h3 class="chart-card-title">{{ $t('overview.modelDistribution') }}</h3>
                    <span class="chart-card-subtitle">{{ $t('overview.modelDistributionSubtitle') }}</span>
                </div>
                <EmptyState
                    v-if="modelCostPieRawData.length === 0 && modelMessagePieRawData.length === 0"
                    :title="$t('overview.noModelData')"
                    data-testid="model-distribution-empty"
                />
                <template v-else>
                    <div
                        v-if="modelLegendItems.length > 0"
                        class="shared-legend"
                    >
                        <button
                            v-for="item in modelLegendItems"
                            :key="item.name"
                            type="button"
                            class="legend-item"
                            :class="{ 'legend-item--hidden': hiddenModels.has(item.name) }"
                            :aria-pressed="!hiddenModels.has(item.name)"
                            :title="$t('overview.toggleItem', { name: item.name })"
                            @click="toggleModel(item.name)"
                        >
                            <span
                                class="legend-dot"
                                :style="{ backgroundColor: item.color }"
                            />
                            {{ item.name }}
                        </button>
                    </div>
                    <div class="distribution-pies">
                        <div class="pie-pane">
                            <h4 class="pie-pane-title">{{ $t('overview.costDistribution') }}</h4>
                            <PieChart
                                v-if="modelCostPieData.length > 0"
                                :data="modelCostPieData"
                                height="240px"
                                :donut="true"
                                :show-legend="false"
                                :tooltip-formatter="modelCostTooltip"
                            />
                            <EmptyState
                                v-else
                                :title="$t('overview.noCostData')"
                                data-testid="model-cost-empty"
                            />
                        </div>
                        <div class="pie-pane">
                            <h4 class="pie-pane-title">{{ $t('overview.messageDistribution') }}</h4>
                            <PieChart
                                v-if="modelMessagePieData.length > 0"
                                :data="modelMessagePieData"
                                height="240px"
                                :donut="true"
                                :show-legend="false"
                                :tooltip-formatter="modelMessageTooltip"
                            />
                            <EmptyState
                                v-else
                                :title="$t('overview.noMessageData')"
                                data-testid="model-message-empty"
                            />
                        </div>
                    </div>
                </template>
            </div>

            <!-- Project Distribution: cost + sessions in one card -->
            <div class="chart-card" data-testid="project-distribution">
                <div class="chart-card-header">
                    <h3 class="chart-card-title">{{ $t('overview.projectDistribution') }}</h3>
                    <span class="chart-card-subtitle">{{ $t('overview.projectDistributionSubtitle') }}</span>
                </div>
                <EmptyState
                    v-if="projectCostPieRawData.length === 0 && projectSessionPieRawData.length === 0"
                    :title="$t('overview.noProjectData')"
                    data-testid="project-distribution-empty"
                />
                <template v-else>
                    <div
                        v-if="projectLegendItems.length > 0"
                        class="shared-legend"
                    >
                        <button
                            v-for="item in projectLegendItems"
                            :key="item.name"
                            type="button"
                            class="legend-item"
                            :class="{ 'legend-item--hidden': hiddenProjects.has(item.name) }"
                            :aria-pressed="!hiddenProjects.has(item.name)"
                            :title="$t('overview.toggleItem', { name: item.name })"
                            @click="toggleProject(item.name)"
                        >
                            <span
                                class="legend-dot"
                                :style="{ backgroundColor: item.color }"
                            />
                            {{ item.name }}
                        </button>
                    </div>
                    <div class="distribution-pies">
                        <div class="pie-pane">
                            <h4 class="pie-pane-title">{{ $t('overview.costDistribution') }}</h4>
                            <PieChart
                                v-if="projectCostPieData.length > 0"
                                :data="projectCostPieData"
                                height="240px"
                                :donut="true"
                                :show-legend="false"
                                :tooltip-formatter="projectCostTooltip"
                            />
                            <EmptyState
                                v-else
                                :title="$t('overview.noCostData')"
                                data-testid="project-cost-empty"
                            />
                        </div>
                        <div class="pie-pane">
                            <h4 class="pie-pane-title">{{ $t('overview.sessionDistribution') }}</h4>
                            <PieChart
                                v-if="projectSessionPieData.length > 0"
                                :data="projectSessionPieData"
                                height="240px"
                                :donut="true"
                                :show-legend="false"
                                :tooltip-formatter="projectSessionTooltip"
                            />
                            <EmptyState
                                v-else
                                :title="$t('overview.noSessionData')"
                                data-testid="project-session-empty"
                            />
                        </div>
                    </div>
                </template>
            </div>

        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type {
  DashboardEfficiencyHeatmapPoint,
  DashboardOverviewProjectDistributionItem,
} from "@/api/client";
import HeatmapChart from "@/charts/HeatmapChart.vue";
import LineChart from "@/charts/LineChart.vue";
import PieChart from "@/charts/PieChart.vue";
import EmptyState from "@/components/EmptyState.vue";
import LoadingState from "@/components/LoadingState.vue";
import MetricCard from "@/components/MetricCard.vue";
import TimeRangePicker from "@/components/TimeRangePicker.vue";
import { useTheme } from "@/composables/useTheme";
import { useOverviewStore } from "@/stores/overview";
import {
  getChartColors,
  HEATMAP_COLORS_DARK,
  HEATMAP_COLORS_LIGHT,
} from "@/utils/chartColors";
import { formatCost, formatNumber, formatTokens } from "@/utils/format";
import {
  formatBucketLocal,
  getRangeMs,
  type TimeRange,
} from "@/utils/timezone";
import { truncatePath } from "@/utils/truncate";

// ── Theme-aware colors ─────────────────────────────────────────────

const { resolvedTheme } = useTheme();
const chartColors = computed(() => getChartColors(resolvedTheme.value));

// ── Store & i18n ───────────────────────────────────────────────────

const store = useOverviewStore();
const { t } = useI18n();

// ── Helpers ─────────────────────────────────────────────────────────

function divideOrNull(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): number | null {
  if (denominator == null || denominator === 0) return null;
  if (numerator == null) return null;
  return numerator / denominator;
}

const selectedPeriod = ref<TimeRange>("7d");
const STALE_MS = 60_000;

function doFetch(): void {
  const { start, end } = getRangeMs(selectedPeriod.value);
  void store.fetchOverview(start, end, { range: selectedPeriod.value });
}

function retryFetch(): void {
  doFetch();
}

function fetchIfStale(): void {
  if (
    !store.lastFetchedAt.value ||
    Date.now() - store.lastFetchedAt.value > STALE_MS
  ) {
    doFetch();
  }
}

watch(selectedPeriod, () => doFetch());

// ── Derived Data ───────────────────────────────────────────────────

const overview = computed(() => store.overview.value);
const loading = computed(() => store.loading.value);
const error = computed(() => store.error.value);
const trendData = computed(() => store.trend.value);
const topModels = computed(() => store.topModels.value);
const projects = computed(() => store.projects.value);

const toolSuccessRate = computed(() => {
  if (!overview.value) return "100";
  const total = overview.value.total_tool_calls;
  if (total === 0) return "100";
  return ((1 - overview.value.total_tool_errors / total) * 100).toFixed(1);
});

// ── Average project fallbacks (backend may omit avg_project_* fields) ─

const avgProjectTokens = computed(
  () =>
    overview.value?.avg_project_tokens ??
    divideOrNull(overview.value?.total_tokens, overview.value?.total_projects),
);

const avgProjectCost = computed(
  () =>
    overview.value?.avg_project_cost ??
    divideOrNull(
      overview.value?.total_cost_usd,
      overview.value?.total_projects,
    ),
);

const avgProjectMessages = computed(
  () =>
    overview.value?.avg_project_messages ??
    divideOrNull(
      overview.value?.total_messages,
      overview.value?.total_projects,
    ),
);

const trendDates = computed(() =>
  trendData.value.map((d) => formatBucketLocal(d.date)),
);

const trendSeries = computed(() => [
  {
    name: "Token",
    data: trendData.value.map((d) => d.tokens),
    color: chartColors.value[0],
    yAxisIndex: 0,
  },
  {
    name: t("overview.seriesMessages"),
    data: trendData.value.map((d) => d.messages),
    color: chartColors.value[1],
    yAxisIndex: 1,
  },
]);

// ── Legend toggle state ──────────────────────────────────────────────

const hiddenModels = ref<Set<string>>(new Set());
const hiddenProjects = ref<Set<string>>(new Set());

function toggleModel(name: string): void {
  const next = new Set(hiddenModels.value);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  hiddenModels.value = next;
}

function toggleProject(name: string): void {
  const next = new Set(hiddenProjects.value);
  if (next.has(name)) next.delete(name);
  else next.add(name);
  hiddenProjects.value = next;
}

// ── Model Distribution ─────────────────────────────────────────────

const modelCostPieRawData = computed(() =>
  topModels.value.map((m) => ({
    name: m.model,
    value: Math.round(m.cost_usd * 10000) / 10000,
  })),
);

const modelMessagePieRawData = computed(() =>
  store.modelMessageDistribution.value
    .filter((m) => m.message_count > 0)
    .map((m) => ({ name: m.model, value: m.message_count })),
);

const modelCostPieData = computed(() =>
  modelCostPieRawData.value.filter((d) => !hiddenModels.value.has(d.name)),
);

const modelMessagePieData = computed(() =>
  modelMessagePieRawData.value.filter((d) => !hiddenModels.value.has(d.name)),
);

const modelLegendItems = computed(() => {
  const seen = new Set<string>();
  const items: Array<{ name: string; color: string }> = [];
  // Cost pie names first (primary ordering)
  for (const d of modelCostPieRawData.value) {
    if (!seen.has(d.name)) {
      seen.add(d.name);
      items.push({
        name: d.name,
        color: chartColors.value[items.length % chartColors.value.length],
      });
    }
  }
  // Message pie names (append unseen)
  for (const d of modelMessagePieRawData.value) {
    if (!seen.has(d.name)) {
      seen.add(d.name);
      items.push({
        name: d.name,
        color: chartColors.value[items.length % chartColors.value.length],
      });
    }
  }
  return items;
});

const modelCostTooltip = (params: unknown): string => {
  const p = params as { name: string; value: number; percent: number };
  return `${p.name}<br/>${t("overview.tooltipCost", { cost: formatCost(p.value), percent: p.percent.toFixed(1) })}`;
};

const modelMessageTooltip = (params: unknown): string => {
  const p = params as { name: string; value: number; percent: number };
  const entry = store.modelMessageDistribution.value.find(
    (m) => m.model === p.name,
  );
  const pct = entry?.percentage ?? p.percent;
  return `${p.name}<br/>${t("overview.tooltipMessages", { count: formatNumber(p.value), percent: pct.toFixed(1) })}`;
};

// ── Project Distribution ───────────────────────────────────────────

const MAX_PIE_SLICES = 8;

function buildProjectPieData(
  items: DashboardOverviewProjectDistributionItem[],
  accessor: (p: DashboardOverviewProjectDistributionItem) => number,
  precision: number,
): Array<{ name: string; value: number }> {
  const withData = items.filter((p) => accessor(p) > 0);
  if (withData.length === 0) return [];
  const sorted = [...withData].sort((a, b) => accessor(b) - accessor(a));
  const top = sorted.slice(0, MAX_PIE_SLICES);
  const rest = sorted.slice(MAX_PIE_SLICES);
  const result: Array<{ name: string; value: number }> = top.map((p) => ({
    name: truncatePath(p.project_path ?? ""),
    value: precision > 0 ? Number(accessor(p).toFixed(precision)) : accessor(p),
  }));
  if (rest.length > 0) {
    const otherSum = rest.reduce((sum, p) => sum + accessor(p), 0);
    result.push({
      name: t("overview.other"),
      value: precision > 0 ? Number(otherSum.toFixed(precision)) : otherSum,
    });
  }
  return result;
}

const projectCostPieRawData = computed(() =>
  buildProjectPieData(projects.value, (p) => p.cost_usd, 4),
);

const projectSessionPieRawData = computed(() =>
  buildProjectPieData(projects.value, (p) => p.session_count, 0),
);

const projectCostPieData = computed(() =>
  projectCostPieRawData.value.filter((d) => !hiddenProjects.value.has(d.name)),
);

const projectSessionPieData = computed(() =>
  projectSessionPieRawData.value.filter(
    (d) => !hiddenProjects.value.has(d.name),
  ),
);

const projectLegendItems = computed(() => {
  const seen = new Set<string>();
  const items: Array<{ name: string; color: string }> = [];
  for (const d of projectCostPieRawData.value) {
    if (!seen.has(d.name)) {
      seen.add(d.name);
      items.push({
        name: d.name,
        color: chartColors.value[items.length % chartColors.value.length],
      });
    }
  }
  for (const d of projectSessionPieRawData.value) {
    if (!seen.has(d.name)) {
      seen.add(d.name);
      items.push({
        name: d.name,
        color: chartColors.value[items.length % chartColors.value.length],
      });
    }
  }
  return items;
});

const projectCostTooltip = (params: unknown): string => {
  const p = params as { name: string; value: number; percent: number };
  return `${p.name}<br/>${t("overview.tooltipCost", { cost: formatCost(p.value), percent: p.percent.toFixed(1) })}`;
};

const projectSessionTooltip = (params: unknown): string => {
  const p = params as { name: string; value: number; percent: number };
  return `${p.name}<br/>${t("overview.tooltipSessions", { count: p.value.toLocaleString("en-US"), percent: p.percent.toFixed(1) })}`;
};

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

const heatmapData = computed(() => store.heatmap.value.map(mapHeatmapPoint));

// ── Lifecycle ──────────────────────────────────────────────────────

onMounted(fetchIfStale);
onActivated(fetchIfStale);
</script>

<style scoped>
.overview-container {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
}

/* ── View Header ─────────────────────────────────────────────────── */

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

/* ── Metrics Row ────────────────────────────────────────────────── */

.metrics-row {
    /* Grid handled by .resp-metrics-5 utility */
    gap: var(--spacing-3);
}

/* ── Section Header ─────────────────────────────────────────────── */

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.section-title {
    font-size: var(--text-lg);
    font-weight: 600;
    color: var(--text);
}

/* ── Trend Section ──────────────────────────────────────────────── */

.trend-section {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
}

/* ── Chart Card ─────────────────────────────────────────────────── */

.chart-card {
    background-color: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    padding: var(--spacing-4);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    transition: border-color 0.2s ease;
}

.chart-card:hover {
    border-color: var(--primary);
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

/* ── Shared Legend ───────────────────────────────────────────────── */

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

/* ── Distribution Pies (side by side) ───────────────────────────── */

.distribution-pies {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-4);
}

.pie-pane {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    min-width: 0;
}

.pie-pane-title {
    font-size: var(--text-sm);
    font-weight: 500;
    color: var(--text-muted);
    text-align: center;
}

/* ── Responsive: pies stack on mobile ───────────────────────────── */

@media (max-width: 767px) {
    .distribution-pies {
        grid-template-columns: 1fr;
    }
}
</style>
