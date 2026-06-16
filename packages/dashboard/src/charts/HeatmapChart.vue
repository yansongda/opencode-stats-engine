<template>
  <BaseChart
    :option="chartOption"
    :height="height"
    :autoresize="autoresize"
    :theme="theme"
    :loading="loading"
  />
</template>

<script setup lang="ts">
import type { EChartsOption } from "echarts";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import BaseChart from "@/charts/BaseChart.vue";
import { useTheme } from "@/composables/useTheme";
import {
  CHART_TEXT_COLOR_DARK,
  CHART_TEXT_COLOR_LIGHT,
} from "@/utils/chartColors";

// ── Types ──────────────────────────────────────────────────────────

interface HeatmapCell {
  /** Day index (0=Mon, 6=Sun) */
  day: number;
  /** Hour index (0-23) */
  hour: number;
  /** Value (e.g., message count) */
  value: number;
}

// ── Props ──────────────────────────────────────────────────────────

const props = withDefaults(
  defineProps<{
    /** Heatmap data points */
    data: HeatmapCell[];
    /** Chart height */
    height?: string;
    /** Auto-resize */
    autoresize?: boolean;
    /** Theme */
    theme?: string | Record<string, unknown>;
    /** Loading state */
    loading?: boolean;
    /** Day labels (default: Mon-Sun) */
    dayLabels?: string[];
    /** Min color for heatmap */
    minColor?: string;
    /** Max color for heatmap */
    maxColor?: string;
  }>(),
  {
    height: "300px",
    autoresize: true,
    theme: undefined,
    loading: false,
    dayLabels: undefined,
    minColor: undefined,
    maxColor: undefined,
  },
);

const { t } = useI18n();
const { resolvedTheme } = useTheme();

/** Day labels: use prop if provided, otherwise fall back to locale-aware defaults. */
const effectiveDayLabels = computed(
  () =>
    props.dayLabels ?? [
      t("components.monday"),
      t("components.tuesday"),
      t("components.wednesday"),
      t("components.thursday"),
      t("components.friday"),
      t("components.saturday"),
      t("components.sunday"),
    ],
);

// ── Chart Option ───────────────────────────────────────────────────

const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

const chartOption = computed<EChartsOption | null>(() => {
  if (props.data.length === 0) return null;

  const valueByCell = new Map<string, number>();
  for (const cell of props.data) {
    valueByCell.set(`${cell.day}:${cell.hour}`, cell.value);
  }

  const maxVal = Math.max(...props.data.map((d) => d.value), 1);

  // Convert to [hour, day, value] format for ECharts heatmap.
  // Fill every weekday/hour cell so empty slots render as the min color.
  const heatData: Array<[number, number, number]> = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      heatData.push([hour, day, valueByCell.get(`${day}:${hour}`) ?? 0]);
    }
  }

  const isDark = resolvedTheme.value === "dark";
  const minColor = props.minColor ?? (isDark ? "#1e293b" : "#ebedf0");
  const maxColor = props.maxColor ?? (isDark ? "#22c55e" : "#40c463");

  return {
    tooltip: {
      position: "top",
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number] };
        if (!p.data) return "";
        const hour = p.data[0];
        const day = effectiveDayLabels.value[p.data[1]] ?? `Day ${p.data[1]}`;
        return `${day} ${hour}:00<br/>${t("components.heatmapTooltip", { count: p.data[2] })}`;
      },
    },
    grid: {
      left: "10%",
      right: "15%",
      bottom: "15%",
      top: "10%",
      containLabel: false,
    },
    xAxis: {
      type: "category",
      data: hours,
      splitArea: { show: true },
      axisLabel: {
        fontSize: 10,
        interval: 2,
      },
    },
    yAxis: {
      type: "category",
      data: effectiveDayLabels.value,
      inverse: true,
      splitArea: { show: true },
      axisLabel: {
        fontSize: 11,
      },
    },
    visualMap: {
      min: 0,
      max: maxVal,
      calculable: true,
      orient: "vertical",
      right: "2%",
      top: "center",
      inRange: {
        color: [minColor, maxColor],
      },
      textStyle: {
        fontSize: 11,
        color: isDark ? CHART_TEXT_COLOR_DARK : CHART_TEXT_COLOR_LIGHT,
      },
    },
    series: [
      {
        type: "heatmap",
        data: heatData,
        label: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: "rgba(0, 0, 0, 0.5)",
          },
        },
      },
    ],
  };
});
</script>
