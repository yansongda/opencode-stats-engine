<template>
  <div class="base-chart" :style="{ height: height }">
    <VChart
      v-if="option"
      :key="chartKey"
      :option="mergedOption"
      :autoresize="autoresize"
      :theme="effectiveTheme"
      :loading="loading"
      :loading-options="resolvedLoadingOptions"
      :update-options="updateOptions"
    />
    <EmptyState
      v-else
      :title="$t('components.noData')"
      :description="$t('components.noDataDesc')"
    />
  </div>
</template>

<script setup lang="ts">
import type { EChartsOption } from "echarts";
import {
  BarChart,
  HeatmapChart,
  LineChart,
  PieChart,
  ScatterChart,
} from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import { registerTheme, use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed } from "vue";
import VChart from "vue-echarts";
import EmptyState from "@/components/EmptyState.vue";
import { useTheme } from "@/composables/useTheme";
import {
  CHART_AXIS_LINE_DARK,
  CHART_AXIS_LINE_LIGHT,
  CHART_SPLIT_LINE_DARK,
  CHART_SPLIT_LINE_LIGHT,
  CHART_TEXT_COLOR_DARK,
  CHART_TEXT_COLOR_LIGHT,
  CHART_TOOLTIP_BG_DARK,
  CHART_TOOLTIP_BG_LIGHT,
  getChartColors,
} from "@/utils/chartColors";

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  VisualMapComponent,
]);

// ── Theme Registration (once at module level) ──────────────────────

registerTheme("opencode-stats-light", {
  color: [...getChartColors("light")],
  backgroundColor: "transparent",
  textStyle: { color: CHART_TEXT_COLOR_LIGHT },
  title: { textStyle: { color: CHART_TEXT_COLOR_LIGHT } },
  legend: {
    textStyle: {
      color: CHART_TEXT_COLOR_LIGHT,
      fontSize: 12,
      textBorderColor: "transparent",
      textBorderWidth: 0,
    },
  },
  tooltip: {
    backgroundColor: CHART_TOOLTIP_BG_LIGHT,
    textStyle: { color: CHART_TEXT_COLOR_LIGHT },
    borderColor: CHART_AXIS_LINE_LIGHT,
  },
  xAxis: {
    axisLine: { lineStyle: { color: CHART_AXIS_LINE_LIGHT } },
    axisLabel: { color: CHART_TEXT_COLOR_LIGHT },
    splitLine: { lineStyle: { color: CHART_SPLIT_LINE_LIGHT } },
  },
  yAxis: {
    axisLine: { lineStyle: { color: CHART_AXIS_LINE_LIGHT } },
    axisLabel: { color: CHART_TEXT_COLOR_LIGHT },
    splitLine: { lineStyle: { color: CHART_SPLIT_LINE_LIGHT } },
  },
});

registerTheme("opencode-stats-dark", {
  color: [...getChartColors("dark")],
  backgroundColor: "transparent",
  textStyle: { color: CHART_TEXT_COLOR_DARK },
  title: { textStyle: { color: CHART_TEXT_COLOR_DARK } },
  legend: {
    textStyle: {
      color: CHART_TEXT_COLOR_DARK,
      fontSize: 12,
      textBorderColor: "transparent",
      textBorderWidth: 0,
    },
  },
  tooltip: {
    backgroundColor: CHART_TOOLTIP_BG_DARK,
    textStyle: { color: CHART_TEXT_COLOR_DARK },
    borderColor: CHART_AXIS_LINE_DARK,
  },
  xAxis: {
    axisLine: { lineStyle: { color: CHART_AXIS_LINE_DARK } },
    axisLabel: { color: CHART_TEXT_COLOR_DARK },
    splitLine: { lineStyle: { color: CHART_SPLIT_LINE_DARK } },
  },
  yAxis: {
    axisLine: { lineStyle: { color: CHART_AXIS_LINE_DARK } },
    axisLabel: { color: CHART_TEXT_COLOR_DARK },
    splitLine: { lineStyle: { color: CHART_SPLIT_LINE_DARK } },
  },
});

// ── Props ──────────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    /** ECharts option object */
    option?: EChartsOption | null;
    /** Chart container height (CSS value) */
    height?: string;
    /** Auto-resize on container change */
    autoresize?: boolean;
    /** Theme name ('dark') or theme object. When undefined, uses the
     *  OpenCode Stats registered theme matching the current resolved theme. */
    theme?: string | Record<string, unknown>;
    /** Show loading animation */
    loading?: boolean;
    /** Loading animation options */
    loadingOptions?: Record<string, unknown>;
  }>(),
  {
    option: null,
    height: "300px",
    autoresize: true,
    theme: undefined,
    loading: false,
    loadingOptions: undefined,
  },
);

// ── Theme Resolution ───────────────────────────────────────────────

const { resolvedTheme } = useTheme();

/**
 * Effective theme passed to vue-echarts.
 *
 * - If an explicit `theme` prop is provided (string or object), it is used as-is
 *   to preserve backward compatibility with callers that pass a custom theme.
 * - Otherwise, the registered `opencode-stats-{light|dark}` theme is used,
 *   driven reactively by `useTheme().resolvedTheme`.
 */
const effectiveTheme = computed<string | Record<string, unknown> | undefined>(
  () => {
    if (props.theme !== undefined) return props.theme;
    return `opencode-stats-${resolvedTheme.value}`;
  },
);

/** Key for forcing VChart re-initialization when theme changes. */
const chartKey = computed<string>(() => {
  const t = effectiveTheme.value;
  return typeof t === "string" ? t : "custom";
});

/** Theme-aware loading overlay to prevent white flash in dark mode. */
const resolvedLoadingOptions = computed<Record<string, unknown>>(() => {
  if (props.loadingOptions) return props.loadingOptions;
  const isDark = resolvedTheme.value === "dark";
  return {
    maskColor: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.85)",
    textColor: isDark ? "#94a3b8" : "#64748b",
    color: isDark ? "#60a5fa" : "#3b82f6",
  };
});

// ── Merged Option ──────────────────────────────────────────────────

const mergedOption = computed<EChartsOption>(() => {
  if (!props.option) return {};

  const isDark = resolvedTheme.value === "dark";
  const textColor = isDark ? CHART_TEXT_COLOR_DARK : CHART_TEXT_COLOR_LIGHT;
  const canvasBg = isDark ? CHART_TOOLTIP_BG_DARK : CHART_TOOLTIP_BG_LIGHT;

  const option = { ...props.option };

  // Inject text color into axis labels so all charts (Bar, Line, Heatmap, Scatter)
  // get consistent label coloring regardless of theme registration quirks.
  const injectAxisColor = (axis: unknown) => {
    if (!axis) return;
    if (Array.isArray(axis)) {
      axis.forEach((a) => {
        if (a && typeof a === "object") {
          (a as Record<string, unknown>).axisLabel = {
            ...((a as Record<string, unknown>).axisLabel as object),
            color: textColor,
          };
        }
      });
    } else if (typeof axis === "object") {
      (axis as Record<string, unknown>).axisLabel = {
        ...((axis as Record<string, unknown>).axisLabel as object),
        color: textColor,
      };
    }
  };

  injectAxisColor(option.xAxis);
  injectAxisColor(option.yAxis);

  // Inject legend text color
  if (option.legend && typeof option.legend === "object") {
    const legend = option.legend as Record<string, unknown>;
    legend.textStyle = { ...(legend.textStyle as object), color: textColor };
  }

  return {
    ...option,
    backgroundColor: canvasBg,
    textStyle: {
      color: textColor,
    },
    animation: true,
    animationDuration: 500,
    animationDurationUpdate: 300,
    animationEasing: "cubicInOut",
    animationEasingUpdate: "cubicOut",
  };
});

// ── Update Options ─────────────────────────────────────────────────
// Merge mode (notMerge: false) + lazy update to batch rapid data changes

const updateOptions = {
  notMerge: false,
  lazyUpdate: true,
  replaceMerge: ["series"],
};
</script>

<style scoped>
.base-chart {
  width: 100%;
  min-height: 100px;
  position: relative;
  background-color: var(--surface);
  border-radius: var(--radius-md);
}
</style>
