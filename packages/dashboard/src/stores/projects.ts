import { type Ref, ref } from "vue";
import {
  type DashboardProjectActivityTrendPoint,
  type DashboardProjectItem,
  type DashboardProjectModelUsageItem,
  type DashboardProjectsData,
  fetchDashboardProjects,
} from "@/api/client";
import { createFetchWrapper } from "./createFetchWrapper";

const projects = ref<DashboardProjectItem[]>([]) as Ref<DashboardProjectItem[]>;
const activityTrend = ref<DashboardProjectActivityTrendPoint[]>([]) as Ref<
  DashboardProjectActivityTrendPoint[]
>;
const projectModelUsage = ref<DashboardProjectModelUsageItem[]>([]) as Ref<
  DashboardProjectModelUsageItem[]
>;

type ProjectsParams = { sort?: string; order?: "asc" | "desc" };

const {
  loading,
  error,
  lastFetchedAt,
  fetch: fetchProjects,
} = createFetchWrapper<DashboardProjectsData, ProjectsParams>({
  apiFn: fetchDashboardProjects,
  assignData: (data) => {
    projects.value = data.projects;
    activityTrend.value = data.activity_trend;
    projectModelUsage.value = data.project_model_usage;
  },
  errorKey: "common.errorLoadProjects",
});

export {
  activityTrend,
  error,
  fetchProjects,
  lastFetchedAt,
  loading,
  projectModelUsage,
  projects,
};

export function useProjectsStore() {
  return {
    projects,
    activityTrend,
    projectModelUsage,
    loading,
    error,
    lastFetchedAt,
    fetchProjects,
  };
}
