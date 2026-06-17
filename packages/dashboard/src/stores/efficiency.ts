import { type Ref, ref } from "vue";
import {
  type DashboardEfficiencyData,
  fetchDashboardEfficiency,
} from "@/api/client";
import { createFetchWrapper } from "./createFetchWrapper";

const efficiencyData = ref<DashboardEfficiencyData | null>(
  null,
) as Ref<DashboardEfficiencyData | null>;

const {
  loading,
  error,
  lastFetchedAt,
  fetch: fetchEfficiency,
} = createFetchWrapper({
  apiFn: fetchDashboardEfficiency,
  assignData: (data) => {
    efficiencyData.value = data;
  },
  errorKey: "common.errorLoadEfficiency",
});

export { efficiencyData, error, fetchEfficiency, lastFetchedAt, loading };

export function useEfficiencyStore() {
  return {
    efficiencyData,
    loading,
    error,
    lastFetchedAt,
    fetchEfficiency,
  };
}
