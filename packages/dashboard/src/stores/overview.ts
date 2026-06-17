import { type Ref, ref } from "vue";
import {
  type DashboardEfficiencyHeatmapPoint,
  type DashboardOverviewProjectDistributionItem,
  type DashboardOverviewSummary,
  type DashboardOverviewTopModel,
  type DashboardOverviewTrendPoint,
  fetchDashboardOverview,
} from "@/api/client";
import { createFetchWrapper } from "./createFetchWrapper";

export interface ModelMessageDistributionItem {
  model: string;
  message_count: number;
  percentage: number;
}

const overview = ref<DashboardOverviewSummary | null>(
  null,
) as Ref<DashboardOverviewSummary | null>;
const trend = ref<DashboardOverviewTrendPoint[]>([]) as Ref<
  DashboardOverviewTrendPoint[]
>;
const heatmap = ref<DashboardEfficiencyHeatmapPoint[]>([]) as Ref<
  DashboardEfficiencyHeatmapPoint[]
>;
const topModels = ref<DashboardOverviewTopModel[]>([]) as Ref<
  DashboardOverviewTopModel[]
>;
const modelMessageDistribution = ref<ModelMessageDistributionItem[]>([]) as Ref<
  ModelMessageDistributionItem[]
>;
const projects = ref<DashboardOverviewProjectDistributionItem[]>([]) as Ref<
  DashboardOverviewProjectDistributionItem[]
>;

const {
  loading,
  error,
  lastFetchedAt,
  fetch: fetchOverview,
} = createFetchWrapper({
  apiFn: fetchDashboardOverview,
  assignData: (data) => {
    overview.value = data.summary;
    trend.value = data.trend ?? [];
    heatmap.value = data.heatmap ?? [];
    topModels.value = data.top_models ?? [];
    modelMessageDistribution.value = data.model_message_distribution ?? [];
    projects.value = data.project_distribution ?? [];
  },
  errorKey: "common.dataLoadFailed",
});

export {
  error,
  fetchOverview,
  heatmap,
  lastFetchedAt,
  loading,
  modelMessageDistribution,
  overview,
  projects,
  topModels,
  trend,
};

export function useOverviewStore() {
  return {
    overview,
    trend,
    heatmap,
    topModels,
    modelMessageDistribution,
    projects,
    loading,
    error,
    lastFetchedAt,
    fetchOverview,
  };
}
