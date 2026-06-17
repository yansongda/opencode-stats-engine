import { type Ref, ref } from "vue";
import {
  type DashboardModelCostTrendPoint,
  type DashboardModelItem,
  fetchDashboardModels,
} from "@/api/client";
import { createFetchWrapper } from "./createFetchWrapper";

const models = ref<DashboardModelItem[]>([]) as Ref<DashboardModelItem[]>;
const modelsCostTrend = ref<DashboardModelCostTrendPoint[]>([]) as Ref<
  DashboardModelCostTrendPoint[]
>;

const {
  loading,
  error,
  lastFetchedAt,
  fetch: fetchModels,
} = createFetchWrapper({
  apiFn: fetchDashboardModels,
  assignData: (data) => {
    models.value = data.models;
    modelsCostTrend.value = data.cost_trend;
  },
  errorKey: "common.errorLoadModels",
});

export { error, fetchModels, lastFetchedAt, loading, models, modelsCostTrend };

export function useModelsStore() {
  return {
    models,
    modelsCostTrend,
    loading,
    error,
    lastFetchedAt,
    fetchModels,
  };
}
