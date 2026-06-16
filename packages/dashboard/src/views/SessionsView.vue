<template>
  <div class="view-container" data-testid="sessions-view">
    <div class="view-header resp-header">
      <h1 class="view-title">{{ $t('sessions.title') }}</h1>
    </div>

    <!-- Loading State (initial no-data only) -->
    <LoadingState v-if="loading && !hasExistingData" :message="$t('sessions.loading')" test-id="sessions-loading" />

    <!-- Error State (no-data only; preserves content when data exists) -->
    <EmptyState
      v-else-if="error && !hasExistingData"
      variant="error"
      :title="$t('common.dataLoadFailed')"
      :description="error"
      :action-label="$t('common.retry')"
      test-id="sessions-error"
      @action="retryFetch"
    />

    <!-- Content -->
    <template v-else>
    <!-- Filter Bar -->
    <div class="filter-bar resp-filter-bar">
      <input
        v-model="searchQuery"
        type="text"
        class="filter-input filter-search"
        :placeholder="$t('sessions.searchPlaceholder')"
        data-testid="filter-search"
      />
      <select v-model="filterStatus" class="filter-select" data-testid="filter-status">
        <option value="all">{{ $t('sessions.filterAllStatus') }}</option>
        <option value="active">{{ $t('sessions.filterActive') }}</option>
        <option value="deleted">{{ $t('sessions.filterDeleted') }}</option>
      </select>
      <select v-model="filterModel" class="filter-select" data-testid="filter-model">
        <option value="all">{{ $t('sessions.filterAllModels') }}</option>
        <option v-for="m in uniqueModels" :key="m" :value="m">{{ m }}</option>
      </select>
      <select v-model="filterProject" class="filter-select" data-testid="filter-project">
        <option value="all">{{ $t('sessions.filterAllProjects') }}</option>
        <option v-for="p in uniqueProjects" :key="p" :value="p">{{ truncatePath(p, { strategy: "tail" }) }}</option>
      </select>
      <input
        v-model="dateFrom"
        type="date"
        class="filter-input filter-date"
        data-testid="filter-date-from"
      />
      <span class="filter-sep">{{ $t('sessions.dateSeparator') }}</span>
      <input
        v-model="dateTo"
        type="date"
        class="filter-input filter-date"
        data-testid="filter-date-to"
      />
      <button class="btn btn-ghost" data-testid="filter-reset" @click="resetFilters">{{ $t('sessions.resetFilters') }}</button>
    </div>

    <!-- Summary Bar -->
    <div class="summary-bar">
      <span class="summary-total">{{ $t('sessions.totalSessions', { count: filteredSessions.length }) }}</span>
      <span class="summary-sep">|</span>
      <span class="summary-active">{{ $t('sessions.activeCount', { count: activeCount }) }}</span>
      <span class="summary-sep">|</span>
      <span class="summary-deleted">{{ $t('sessions.deletedCount', { count: deletedCount }) }}</span>
      <span v-if="allSessions.length === 500" class="summary-truncated">{{ $t('sessions.truncatedNotice') }}</span>
    </div>

    <!-- Data Table -->
    <div class="table-wrapper resp-table-wrapper">
      <table class="data-table" data-testid="sessions-table">
        <thead>
          <tr>
            <th
              class="col-session-id sortable"
              :class="{ sorted: sortKey === 'session_id' }"
              @click="toggleSort('session_id')"
            >
              {{ $t('sessions.colSessionId') }}
              <span class="sort-indicator">{{ sortIndicator('session_id') }}</span>
            </th>
            <th class="col-title">{{ $t('sessions.colTitle') }}</th>
            <th
              class="col-project sortable"
              :class="{ sorted: sortKey === 'project_path' }"
              @click="toggleSort('project_path')"
            >
              {{ $t('sessions.colProject') }}
              <span class="sort-indicator">{{ sortIndicator('project_path') }}</span>
            </th>
            <th
              class="col-model sortable"
              :class="{ sorted: sortKey === 'primary_model' }"
              @click="toggleSort('primary_model')"
            >
              {{ $t('sessions.colModel') }}
              <span class="sort-indicator">{{ sortIndicator('primary_model') }}</span>
            </th>
            <th
              class="col-tokens sortable"
              :class="{ sorted: sortKey === 'total_tokens' }"
              @click="toggleSort('total_tokens')"
            >
              Token
              <span class="sort-indicator">{{ sortIndicator('total_tokens') }}</span>
            </th>
            <th
              class="col-msg-count sortable"
              :class="{ sorted: sortKey === 'message_count' }"
              @click="toggleSort('message_count')"
            >
              {{ $t('sessions.colMessageCount') }}
              <span class="sort-indicator">{{ sortIndicator('message_count') }}</span>
            </th>
            <th
              class="col-cost sortable"
              :class="{ sorted: sortKey === 'total_cost_usd' }"
              @click="toggleSort('total_cost_usd')"
            >
              {{ $t('sessions.colCost') }}
              <span class="sort-indicator">{{ sortIndicator('total_cost_usd') }}</span>
            </th>
            <th class="col-status">{{ $t('sessions.colStatus') }}</th>
            <th
              class="col-date sortable"
              :class="{ sorted: sortKey === 'last_event_at_ms' }"
              @click="toggleSort('last_event_at_ms')"
            >
              {{ $t('sessions.colLastActive') }}
              <span class="sort-indicator">{{ sortIndicator('last_event_at_ms') }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="session in paginatedSessions"
            :key="session.session_id"
            :class="{
              'row-deleted': session.status === 'deleted',
              'row-selected': selectedSessionId === session.session_id,
            }"
            class="clickable-row"
            :data-testid="`session-row-${session.session_id}`"
            @click="selectSession(session.session_id)"
          >
            <td class="col-session-id">
              <span class="session-id-truncated" :title="session.session_id">
                {{ truncateSessionId(session.session_id) }}
              </span>
            </td>
            <td class="col-title" :title="session.title ?? ''">
              {{ session.title ?? '\u2014' }}
            </td>
            <td class="col-project" :title="session.project_path ?? ''">
              {{ truncatePath(session.project_path ?? '\u2014', { strategy: "tail" }) }}
            </td>
            <td class="col-model">{{ session.primary_model ?? '\u2014' }}</td>
            <td class="col-tokens">{{ formatTokens(session.total_tokens) }}</td>
            <td class="col-msg-count">{{ formatNumber(session.message_count) }}</td>
            <td class="col-cost">{{ formatCost(session.total_cost_usd) }}</td>
            <td class="col-status">
              <StatusBadge :status="session.status" />
            </td>
            <td class="col-date">{{ formatTimestamp(session.last_event_at_ms) }}</td>
          </tr>
          <tr v-if="paginatedSessions.length === 0">
            <td colspan="9" class="empty-state">{{ $t('sessions.noMatchingSessions') }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div class="pagination-bar" data-testid="pagination">
      <span class="pagination-info">
        {{ $t('sessions.pagination', { start: paginationStart, end: paginationEnd, total: filteredSessions.length }) }}
      </span>
      <div class="pagination-controls">
        <button
          class="btn btn-ghost btn-sm"
          :disabled="currentPage === 1"
          data-testid="page-prev"
          @click="currentPage--"
        >
          {{ $t('sessions.prevPage') }}
        </button>
        <button
          v-for="page in visiblePages"
          :key="page"
          class="btn btn-sm"
          :class="page === currentPage ? 'btn-primary' : 'btn-ghost'"
          @click="currentPage = page"
        >
          {{ page }}
        </button>
        <button
          class="btn btn-ghost btn-sm"
          :disabled="currentPage >= totalPages"
          data-testid="page-next"
          @click="currentPage++"
        >
          {{ $t('sessions.nextPage') }}
        </button>
      </div>
    </div>

    <!-- Session Detail Drawer -->
    <div
      v-if="selectedSessionId || detailLoading || selectedDetail || detailError"
      class="detail-drawer-shell"
      data-testid="session-detail-drawer"
    >
      <button
        class="detail-backdrop"
        type="button"
        :aria-label="$t('sessions.closeDetailAriaLabel')"
        @click="closeDetail"
      />
      <aside class="detail-drawer" :aria-label="$t('sessions.detailAriaLabel')">
        <div v-if="detailLoading" class="detail-loading" data-testid="session-detail-loading">{{ $t('sessions.detailLoading') }}</div>
        <div v-else-if="detailError" class="detail-loading" data-testid="session-detail-error">
          <p class="detail-error-message">{{ detailError }}</p>
        </div>
        <template v-else-if="selectedDetail">
      <div class="detail-header">
        <h2 class="detail-title">
          {{ $t('sessions.detailTitle') }}
          <code class="detail-session-id">{{ selectedDetail.session.session_id }}</code>
        </h2>
        <button class="btn btn-ghost btn-sm" @click="closeDetail">{{ $t('sessions.close') }}</button>
      </div>

      <!-- Basic Info -->
      <CollapsibleSection section-key="basic-info" :title="$t('sessions.sectionBasicInfo')" :collapsible="false">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelTitle') }}</span>
            <span class="detail-value">{{ selectedDetail.session.title ?? '\u2014' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelProject') }}</span>
            <span class="detail-value" :title="selectedDetail.session.project_path ?? ''">{{ truncatePath(selectedDetail.session.project_path ?? '\u2014', { strategy: "tail" }) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelModel') }}</span>
            <span class="detail-value">{{ selectedDetail.session.primary_model ?? '\u2014' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelStatus') }}</span>
            <span class="detail-value"><StatusBadge :status="selectedDetail.session.status" /></span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelDuration') }}</span>
            <span class="detail-value">{{ formatSessionDuration(selectedDetail.session.duration_ms) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelMessageCount') }}</span>
            <span class="detail-value">{{ formatNumber(selectedDetail.session.message_count) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelFirstEvent') }}</span>
            <span class="detail-value">{{ formatTimestamp(selectedDetail.session.first_event_at_ms) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelLastEvent') }}</span>
            <span class="detail-value">{{ formatTimestamp(selectedDetail.session.last_event_at_ms) }}</span>
          </div>
        </div>
      </CollapsibleSection>

      <!-- Token Stats -->
      <CollapsibleSection section-key="token-stats" :title="$t('sessions.sectionTokenStats')" :collapsible="false">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelTotal') }}</span>
            <span class="detail-value detail-value-highlight">{{ formatTokens(selectedDetail.session.total_tokens) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelInput') }}</span>
            <span class="detail-value">{{ formatTokens(selectedDetail.session.input_tokens) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelOutput') }}</span>
            <span class="detail-value">{{ formatTokens(selectedDetail.session.output_tokens) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelReasoning') }}</span>
            <span class="detail-value">{{ formatTokens(selectedDetail.session.reasoning_tokens) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelCacheRead') }}</span>
            <span class="detail-value">{{ formatTokens(selectedDetail.session.cache_read) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelCacheWrite') }}</span>
            <span class="detail-value">{{ formatTokens(selectedDetail.session.cache_write) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelCost') }}</span>
            <span class="detail-value detail-value-highlight">{{ formatCost(selectedDetail.session.total_cost_usd) }}</span>
          </div>
        </div>
      </CollapsibleSection>

      <!-- Messages & Tools -->
      <CollapsibleSection section-key="messages-tools" :title="$t('sessions.sectionMessagesTools')" :collapsible="false">
        <div class="detail-grid">
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelUserMessages') }}</span>
            <span class="detail-value">{{ formatNumber(selectedDetail.session.user_message_count) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelAssistantMessages') }}</span>
            <span class="detail-value">{{ formatNumber(selectedDetail.session.assistant_message_count) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelToolCalls') }}</span>
            <span class="detail-value">{{ formatNumber(selectedDetail.session.tool_call_count) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelToolErrors') }}</span>
            <span class="detail-value">{{ formatNumber(selectedDetail.session.tool_error_count) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelFileChanges') }}</span>
            <span class="detail-value">{{ formatNumber(selectedDetail.session.files_changed) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelCodeChanges') }}</span>
            <span class="detail-value">+{{ formatNumber(selectedDetail.session.lines_added) }} / -{{ formatNumber(selectedDetail.session.lines_deleted) }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">{{ $t('sessions.labelErrorCount') }}</span>
            <span class="detail-value">{{ formatNumber(selectedDetail.session.error_count) }}</span>
          </div>
        </div>
      </CollapsibleSection>

      <!-- Model Usage -->
      <CollapsibleSection v-if="selectedDetail.model_usage.length > 0" section-key="model-usage" :title="$t('sessions.sectionModelUsage')" :collapsible="false">
        <div class="table-wrapper">
          <table class="data-table detail-table">
            <thead>
              <tr>
                <th>{{ $t('sessions.colModelDetail') }}</th>
                <th class="col-right">{{ $t('sessions.colMessages') }}</th>
                <th class="col-right">{{ $t('sessions.colInputToken') }}</th>
                <th class="col-right">{{ $t('sessions.colOutputToken') }}</th>
                <th class="col-right">{{ $t('sessions.colReasoningToken') }}</th>
                <th class="col-right">{{ $t('sessions.colTotalToken') }}</th>
                <th class="col-right">{{ $t('sessions.colCostDetail') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="mu in selectedDetail.model_usage" :key="mu.model">
                <td class="col-monospace">{{ mu.model }}</td>
                <td class="col-right">{{ formatNumber(mu.message_count) }}</td>
                <td class="col-right">{{ formatTokens(mu.input_tokens) }}</td>
                <td class="col-right">{{ formatTokens(mu.output_tokens) }}</td>
                <td class="col-right">{{ formatTokens(mu.reasoning_tokens) }}</td>
                <td class="col-right">{{ formatTokens(mu.total_tokens) }}</td>
                <td class="col-right">{{ formatCost(mu.cost_usd) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <!-- Tool Calls -->
      <CollapsibleSection v-if="selectedDetail.tool_calls.length > 0" section-key="tool-calls" :title="$t('sessions.sectionToolCalls')">
        <div class="table-wrapper">
          <table class="data-table detail-table">
            <thead>
              <tr>
                <th>{{ $t('sessions.colToolDetail') }}</th>
                <th>{{ $t('sessions.colTitleDetail') }}</th>
                <th>{{ $t('sessions.colStatusDetail') }}</th>
                <th class="col-right">{{ $t('sessions.colDurationDetail') }}</th>
                <th>{{ $t('sessions.colError') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tc in selectedDetail.tool_calls" :key="tc.call_id">
                <td class="col-monospace">{{ tc.tool_name }}</td>
                <td>{{ tc.title ?? '\u2014' }}</td>
                <td>
                  <span :class="tc.status === 'completed' ? 'badge-active' : tc.status === 'failed' ? 'badge-deleted' : ''">
                    {{ tc.status ?? '\u2014' }}
                  </span>
                </td>
                <td class="col-right">{{ formatSessionDuration(tc.duration_ms) }}</td>
                <td class="col-error-msg">{{ tc.error_message ?? '\u2014' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <!-- Messages Metadata -->
      <CollapsibleSection v-if="selectedDetail.messages.length > 0" section-key="message-metadata" :title="$t('sessions.sectionMessageMetadata')">
        <div class="table-wrapper">
          <table class="data-table detail-table">
            <thead>
              <tr>
                <th>{{ $t('sessions.colRole') }}</th>
                <th>{{ $t('sessions.colModelMeta') }}</th>
                <th class="col-right">Token</th>
                <th class="col-right">{{ $t('sessions.colCostMeta') }}</th>
                <th class="col-right">{{ $t('sessions.colFileChanges') }}</th>
                <th class="col-right">{{ $t('sessions.colDurationMeta') }}</th>
                <th>{{ $t('sessions.colStatusMeta') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="msg in selectedDetail.messages" :key="msg.message_id">
                <td>{{ msg.role === 'user' ? $t('sessions.roleUser') : $t('sessions.roleAssistant') }}</td>
                <td class="col-monospace">{{ msg.model ?? '\u2014' }}</td>
                <td class="col-right">{{ formatTokens(msg.total_tokens) }}</td>
                <td class="col-right">{{ formatCost(msg.cost_usd) }}</td>
                <td class="col-right">{{ msg.files_changed > 0 ? msg.files_changed : '\u2014' }}</td>
                <td class="col-right">{{ formatSessionDuration(msg.duration_ms) }}</td>
                <td>
                  <span v-if="msg.has_error" class="badge-deleted">{{ msg.error_type ?? $t('sessions.errorBadge') }}</span>
                  <span v-else class="badge-active">{{ $t('sessions.okBadge') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>

      <!-- Errors -->
      <CollapsibleSection v-if="selectedDetail.errors.length > 0" section-key="errors" :title="$t('sessions.sectionErrors')">
        <div class="table-wrapper">
          <table class="data-table detail-table">
            <thead>
              <tr>
                <th>{{ $t('sessions.colEventType') }}</th>
                <th>{{ $t('sessions.colErrorMessage') }}</th>
                <th class="col-right">{{ $t('sessions.colTime') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="err in selectedDetail.errors" :key="err.event_id">
                <td class="col-monospace">{{ err.event_type }}</td>
                <td class="col-error-msg">{{ err.message }}</td>
                <td class="col-right">{{ formatTimestamp(err.created_at_ms) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
        </template>
      </aside>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  h,
  onActivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import {
  type DashboardSessionDetailData,
  type DashboardSessionListItem,
  fetchDashboardSessionDetail,
} from "@/api/client";
import CollapsibleSection from "@/components/CollapsibleSection.vue";
import EmptyState from "@/components/EmptyState.vue";
import LoadingState from "@/components/LoadingState.vue";
import { useSessionsStore } from "@/stores/sessions";
import {
  createDurationI18n,
  formatCost,
  formatDuration,
  formatNumber,
  formatTokens,
} from "@/utils/format";
import { formatTimestamp, parseLocalDateInput } from "@/utils/timezone";
import { truncatePath, truncateSessionId } from "@/utils/truncate";

// ── i18n ────────────────────────────────────────────────────────────────

const { t } = useI18n();

// ── Store ──────────────────────────────────────────────────────────────

const store = useSessionsStore();

// ── Data (from per-page store) ────────────────────────────────────────

const allSessions = computed<DashboardSessionListItem[]>(
  () => store.sessions.value,
);
const loading = computed(() => store.loading.value);
const error = computed(() => store.error.value);
const hasExistingData = computed(() => allSessions.value.length > 0);

// ── Lifecycle ────────────────────────────────────────────────────────

async function refreshIfStale(force = false): Promise<void> {
  if (
    !force &&
    store.lastFetchedAt.value != null &&
    Date.now() - store.lastFetchedAt.value <= 60_000
  ) {
    return;
  }
  await store.fetchSessions(undefined, undefined, { limit: 500 });
}

function retryFetch(): void {
  void refreshIfStale(true);
}

onMounted(() => {
  void refreshIfStale(true);
  window.addEventListener("keydown", handleDetailKeydown);
});
onActivated(() => {
  void refreshIfStale(false);
});
onUnmounted(() => {
  window.removeEventListener("keydown", handleDetailKeydown);
});

// ── Filters ──────────────────────────────────────────────────────────

const searchQuery = ref("");
const filterStatus = ref<"all" | "active" | "deleted">("all");
const filterModel = ref("all");
const filterProject = ref("all");
const dateFrom = ref("");
const dateTo = ref("");

// ── Sorting ──────────────────────────────────────────────────────────

type SortKey =
  | "session_id"
  | "project_path"
  | "primary_model"
  | "total_tokens"
  | "message_count"
  | "total_cost_usd"
  | "last_event_at_ms";
const sortKey = ref<SortKey>("last_event_at_ms");
const sortDir = ref<"asc" | "desc">("desc");

function toggleSort(key: SortKey): void {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortKey.value = key;
    sortDir.value =
      key === "total_tokens" ||
      key === "total_cost_usd" ||
      key === "message_count"
        ? "desc"
        : "asc";
  }
}

function sortIndicator(key: SortKey): string {
  if (sortKey.value !== key) return "\u2195";
  return sortDir.value === "asc" ? "\u2191" : "\u2193";
}

// ── Derived Data ─────────────────────────────────────────────────────

const uniqueModels = computed(() => {
  const models = new Set<string>();
  for (const s of allSessions.value) {
    if (s.primary_model) models.add(s.primary_model);
  }
  return [...models].sort();
});

const uniqueProjects = computed(() => {
  const projects = new Set<string>();
  for (const s of allSessions.value) {
    if (s.project_path) projects.add(s.project_path);
  }
  return [...projects].sort();
});

const filteredSessions = computed<DashboardSessionListItem[]>(() => {
  let list = [...allSessions.value];

  // Status filter
  if (filterStatus.value !== "all") {
    list = list.filter((s) => s.status === filterStatus.value);
  }

  // Model filter
  if (filterModel.value !== "all") {
    list = list.filter((s) => s.primary_model === filterModel.value);
  }

  // Project filter
  if (filterProject.value !== "all") {
    list = list.filter((s) => s.project_path === filterProject.value);
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(
      (s) =>
        s.session_id.toLowerCase().includes(q) ||
        (s.project_path ?? "").toLowerCase().includes(q) ||
        (s.title ?? "").toLowerCase().includes(q),
    );
  }

  // Date range filter (based on last_event_at_ms, which is ms timestamp)
  if (dateFrom.value) {
    const from = parseLocalDateInput(dateFrom.value, "start");
    list = list.filter((s) => {
      if (s.last_event_at_ms == null) return false;
      return s.last_event_at_ms >= from;
    });
  }
  if (dateTo.value) {
    const to = parseLocalDateInput(dateTo.value, "end");
    list = list.filter((s) => {
      if (s.last_event_at_ms == null) return false;
      return s.last_event_at_ms <= to;
    });
  }

  // Sort
  list.sort((a, b) => {
    const aVal = a[sortKey.value];
    const bVal = b[sortKey.value];
    let cmp = 0;
    if (typeof aVal === "number" && typeof bVal === "number") {
      cmp = aVal - bVal;
    } else {
      cmp = String(aVal ?? "").localeCompare(String(bVal ?? ""));
    }
    return sortDir.value === "asc" ? cmp : -cmp;
  });

  return list;
});

const activeCount = computed(
  () => filteredSessions.value.filter((s) => s.status === "active").length,
);
const deletedCount = computed(
  () => filteredSessions.value.filter((s) => s.status === "deleted").length,
);

// ── Pagination ───────────────────────────────────────────────────────

const PAGE_SIZE = 50;
const currentPage = ref(1);

// Reset page when filters change
watch(
  [searchQuery, filterStatus, filterModel, filterProject, dateFrom, dateTo],
  () => {
    currentPage.value = 1;
  },
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredSessions.value.length / PAGE_SIZE)),
);

const paginationStart = computed(() =>
  filteredSessions.value.length === 0
    ? 0
    : (currentPage.value - 1) * PAGE_SIZE + 1,
);
const paginationEnd = computed(() =>
  Math.min(currentPage.value * PAGE_SIZE, filteredSessions.value.length),
);

const paginatedSessions = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE;
  return filteredSessions.value.slice(start, start + PAGE_SIZE);
});

const visiblePages = computed(() => {
  const pages: number[] = [];
  const total = totalPages.value;
  const current = currentPage.value;
  const start = Math.max(1, current - 2);
  const end = Math.min(total, current + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

// ── Session Detail ───────────────────────────────────────────────────

const selectedSessionId = ref<string | null>(null);
const selectedDetail = ref<DashboardSessionDetailData | null>(null);
const detailLoading = ref(false);
const detailError = ref<string | null>(null);

function closeDetail(): void {
  selectedSessionId.value = null;
  selectedDetail.value = null;
  detailLoading.value = false;
  detailError.value = null;
}

function handleDetailKeydown(event: KeyboardEvent): void {
  if (
    event.key === "Escape" &&
    (selectedSessionId.value ||
      selectedDetail.value ||
      detailLoading.value ||
      detailError.value)
  ) {
    closeDetail();
  }
}

async function selectSession(sessionId: string): Promise<void> {
  if (selectedSessionId.value === sessionId) {
    closeDetail();
    return;
  }
  selectedSessionId.value = sessionId;
  selectedDetail.value = null;
  detailError.value = null;
  detailLoading.value = true;
  try {
    const detail = await fetchDashboardSessionDetail(sessionId);
    if (selectedSessionId.value === sessionId) {
      selectedDetail.value = detail;
    }
  } catch (err) {
    if (selectedSessionId.value === sessionId) {
      detailError.value = err instanceof Error ? err.message : String(err);
    }
  } finally {
    if (selectedSessionId.value === sessionId) {
      detailLoading.value = false;
    }
  }
}

// ── Actions ──────────────────────────────────────────────────────────

function resetFilters(): void {
  searchQuery.value = "";
  filterStatus.value = "all";
  filterModel.value = "all";
  filterProject.value = "all";
  dateFrom.value = "";
  dateTo.value = "";
}

// ── Formatters ───────────────────────────────────────────────────────

const sessionsDurationI18n = createDurationI18n(t, {
  sec: "sessions.durationSec",
  minSec: "sessions.durationMinSec",
  hourMin: "sessions.durationHourMin",
  minutes: "sessions.durationMinSec",
  hours: "sessions.durationHourMin",
  hoursMin: "sessions.durationHourMin",
});

function formatSessionDuration(ms: number | null | undefined): string {
  return formatDuration(ms, { precision: "ms", i18n: sessionsDurationI18n });
}

// ── StatusBadge Component ─────────────────────────────────────────────

const StatusBadge = {
  props: {
    status: { type: String, required: true },
  },
  setup(props: { status: string }) {
    const { t } = useI18n();
    return () => {
      const isActive = props.status === "active";
      return h(
        "span",
        {
          class: ["status-badge", isActive ? "badge-active" : "badge-deleted"],
        },
        isActive ? t("sessions.statusActive") : t("sessions.statusDeleted"),
      );
    };
  },
};
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

/* ── Filter Bar ─────────────────────────────────────────────────────── */

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  align-items: center;
  padding: var(--spacing-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-3);
}

.filter-input,
.filter-select {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--spacing-2) var(--spacing-3);
  font-size: var(--text-base);
  outline: none;
  transition: border-color 0.15s ease;
}

.filter-input:focus,
.filter-select:focus {
  border-color: var(--primary);
}

.filter-search {
  min-width: 200px;
  flex: 1;
}

.filter-date {
  width: 140px;
}

.filter-sep {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

/* ── Summary Bar ────────────────────────────────────────────────────── */

.summary-bar {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin-bottom: var(--spacing-2);
}

.summary-total {
  color: var(--text);
  font-weight: 500;
}

.summary-active {
  color: var(--success);
}

.summary-deleted {
  color: var(--danger);
}

.summary-sep {
  opacity: 0.4;
}

.summary-truncated {
  margin-left: auto;
  color: var(--text-muted);
}

/* ── Data Table ─────────────────────────────────────────────────────── */

.table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-base);
}

.data-table thead {
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 1;
}

.data-table th {
  padding: var(--spacing-2) var(--spacing-3);
  text-align: center;
  font-weight: 500;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  user-select: none;
}

.data-table th.sortable {
  cursor: pointer;
  transition: color 0.15s ease;
}

.data-table th.sortable:hover {
  color: var(--text);
}

.data-table th.sorted {
  color: var(--primary);
}

.sort-indicator {
  font-size: var(--text-xs);
  margin-left: var(--spacing-1);
  opacity: 0.6;
}

.data-table td {
  padding: var(--spacing-2) var(--spacing-3);
  border-bottom: 1px solid var(--border);
  color: var(--text);
  vertical-align: middle;
  text-align: center;
}

.data-table tbody tr {
  transition: background-color 0.1s ease;
}

.data-table tbody tr.clickable-row {
  cursor: pointer;
}

.data-table tbody tr.clickable-row:hover {
  background: var(--surface-hover);
}

/* Deleted row highlight */
.data-table tbody tr.row-deleted {
  background: var(--danger-subtle);
}

.data-table tbody tr.row-deleted:hover {
  background: var(--danger-subtle);
}

/* Selected row highlight */
.data-table tbody tr.row-selected {
  background: var(--primary-subtle);
}

.data-table tbody tr.row-selected:hover {
  background: var(--primary-subtle);
}

/* Column widths */
.col-session-id {
  min-width: 130px;
}

.col-title {
  min-width: 120px;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-project {
  min-width: 150px;
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-model {
  min-width: 80px;
}

.col-tokens,
.col-msg-count,
.col-cost {
  text-align: center;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.col-status {
  text-align: center;
  width: 80px;
}

.col-date {
  white-space: nowrap;
  min-width: 100px;
}

.session-id-truncated {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: var(--text-sm);
  color: var(--primary);
  background: var(--primary-subtle);
  padding: 1px var(--spacing-1);
  border-radius: var(--radius-sm);
  cursor: help;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
  padding: var(--spacing-6) !important;
  font-style: italic;
}

/* ── Status Badge ───────────────────────────────────────────────────── */

:deep(.status-badge) {
  display: inline-block;
  padding: 1px var(--spacing-2);
  border-radius: var(--radius-lg);
  font-size: var(--text-xs);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

:deep(.badge-active) {
  color: var(--success);
  background: var(--success-subtle);
}

:deep(.badge-deleted) {
  color: var(--danger);
  background: var(--danger-subtle);
}

/* ── Pagination ─────────────────────────────────────────────────────── */

.pagination-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.pagination-controls {
  display: flex;
  gap: var(--spacing-1);
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
  font-style: normal;
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

.detail-session-id {
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

.detail-drawer :deep(.collapsible-section) {
  padding-left: var(--spacing-4);
  padding-right: var(--spacing-4);
}

.detail-section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--spacing-2);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--spacing-2) var(--spacing-4);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.detail-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.detail-value {
  font-size: var(--text-base);
  color: var(--text);
}

.detail-value-highlight {
  font-weight: 600;
  color: var(--primary);
}

/* ── Detail Tables ───────────────────────────────────────────────────── */

.detail-table {
  font-size: var(--text-sm);
}

.detail-table th {
  font-size: var(--text-xs);
}

.col-monospace {
  font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: var(--text-sm);
}

.col-error-msg {
  max-width: 250px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--text-sm);
  color: var(--danger);
}

/* ── Shared Button Styles ───────────────────────────────────────────── */

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-2) var(--spacing-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  cursor: pointer;
  transition: all 0.15s ease;
  background: var(--surface);
  color: var(--text);
}

.btn:hover:not(:disabled) {
  background: var(--surface-hover);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
}

.btn-ghost {
  background: transparent;
  border-color: transparent;
}

.btn-ghost:hover:not(:disabled) {
  background: var(--surface-hover);
}

.btn-sm {
  padding: var(--spacing-1) var(--spacing-2);
  font-size: var(--text-sm);
}

/* ── Responsive ─────────────────────────────────────────────────────── */

@media (max-width: 767px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-search,
  .filter-select,
  .filter-date {
    width: 100%;
  }

  .pagination-bar {
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .detail-drawer {
    width: 100vw;
    padding: var(--spacing-3);
  }

  .detail-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
}
</style>
