import { type Ref, ref } from "vue";
import {
  type DashboardToolItem,
  type DashboardToolRecentError,
  type DashboardToolsSummary,
  type DashboardToolTimelinePoint,
  fetchDashboardTools,
} from "@/api/client";
import { createFetchWrapper } from "./createFetchWrapper";

const toolCalls = ref<DashboardToolItem[]>([]) as Ref<DashboardToolItem[]>;
const toolSummary = ref<DashboardToolsSummary | null>(
  null,
) as Ref<DashboardToolsSummary | null>;
const toolTimeline = ref<DashboardToolTimelinePoint[]>([]) as Ref<
  DashboardToolTimelinePoint[]
>;
const toolRecentErrors = ref<DashboardToolRecentError[]>([]) as Ref<
  DashboardToolRecentError[]
>;

const {
  loading,
  error,
  lastFetchedAt,
  fetch: fetchTools,
} = createFetchWrapper({
  apiFn: fetchDashboardTools,
  assignData: (data) => {
    toolCalls.value = data.tools;
    toolSummary.value = data.summary;
    toolTimeline.value = data.timeline;
    toolRecentErrors.value = data.recent_errors;
  },
  errorKey: "common.errorLoadTools",
});

export {
  error,
  fetchTools,
  lastFetchedAt,
  loading,
  toolCalls,
  toolRecentErrors,
  toolSummary,
  toolTimeline,
};

export function useToolsStore() {
  return {
    toolCalls,
    toolSummary,
    toolTimeline,
    toolRecentErrors,
    loading,
    error,
    lastFetchedAt,
    fetchTools,
  };
}
