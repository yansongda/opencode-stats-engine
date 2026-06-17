import { type Ref, ref } from "vue";
import {
  type DashboardSessionListItem,
  fetchDashboardSessions,
} from "@/api/client";
import { createFetchWrapper } from "./createFetchWrapper";

const sessions = ref<DashboardSessionListItem[]>([]) as Ref<
  DashboardSessionListItem[]
>;

type SessionsParams = {
  limit?: number;
  offset?: number;
  status?: string;
};

const {
  loading,
  error,
  lastFetchedAt,
  fetch: fetchSessions,
} = createFetchWrapper<DashboardSessionListItem[], SessionsParams>({
  apiFn: fetchDashboardSessions,
  assignData: (data) => {
    sessions.value = data;
  },
  errorKey: "common.errorLoadSessions",
  hasRange: false,
});

export { error, fetchSessions, lastFetchedAt, loading, sessions };

export function useSessionsStore() {
  return {
    sessions,
    loading,
    error,
    lastFetchedAt,
    fetchSessions,
  };
}
