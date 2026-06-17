import { type Ref, ref } from "vue";
import i18n from "@/i18n";
import { getRangeMs, type TimeRange } from "@/utils/timezone";

type ApiFnWithParams<TData, TParams> = (
  start?: number,
  end?: number,
  params?: TParams,
) => Promise<TData>;

type ApiFnWithoutParams<TData> = (
  start?: number,
  end?: number,
) => Promise<TData>;

interface FetchWrapperOptions<TData, TParams = void> {
  apiFn: TParams extends void
    ? ApiFnWithoutParams<TData>
    : ApiFnWithParams<TData, TParams>;
  assignData: (data: TData) => void;
  errorKey: string;
  hasRange?: boolean;
}

export function createFetchWrapper<TData, TParams = void>(
  options: FetchWrapperOptions<TData, TParams>,
) {
  const { apiFn, assignData, errorKey, hasRange = true } = options;

  const loading = ref(false) as Ref<boolean>;
  const error = ref<string | null>(null) as Ref<string | null>;
  const lastFetchedAt = ref<number | null>(null) as Ref<number | null>;

  const lastParams = ref<{
    start?: number;
    end?: number;
    params?: TParams;
    range?: TimeRange;
  } | null>(null);

  async function fetch(
    start?: number,
    end?: number,
    paramsOrOptions?: TParams | { silent?: boolean; range?: TimeRange },
    optionsOnly?: { silent?: boolean; range?: TimeRange },
  ): Promise<boolean> {
    let params: TParams | undefined;
    let options: { silent?: boolean; range?: TimeRange } | undefined;

    if (optionsOnly !== undefined) {
      params = paramsOrOptions as TParams;
      options = optionsOnly;
    } else if (
      paramsOrOptions &&
      typeof paramsOrOptions === "object" &&
      ("silent" in paramsOrOptions || "range" in paramsOrOptions)
    ) {
      options = paramsOrOptions as {
        silent?: boolean;
        range?: TimeRange;
      };
    } else {
      params = paramsOrOptions as TParams;
    }

    const silent = options?.silent ?? false;

    const hasNewParams =
      start !== undefined || end !== undefined || params !== undefined;

    if (hasNewParams) {
      lastParams.value = {
        start,
        end,
        params,
        range: options?.range,
      };
    }

    if (lastParams.value) {
      if (!hasNewParams && hasRange && options?.range) {
        lastParams.value.range = options.range;
      }

      if (start === undefined && end === undefined) {
        if (hasRange && lastParams.value.range) {
          const range = getRangeMs(lastParams.value.range);
          start = range.start;
          end = range.end;
        } else {
          start = lastParams.value.start;
          end = lastParams.value.end;
        }
      }

      if (params === undefined) {
        params = lastParams.value.params as TParams | undefined;
      }
    }

    if (!silent) {
      loading.value = true;
      error.value = null;
    }

    try {
      const fn = apiFn as ApiFnWithParams<TData, TParams>;
      const data = await fn(start, end, params);
      assignData(data);
      lastFetchedAt.value = Date.now();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : i18n.global.t(errorKey);
      if (silent) {
        console.warn(`[silent fetch] ${msg}`);
      } else {
        error.value = msg;
      }
      return false;
    } finally {
      if (!silent) {
        loading.value = false;
      }
    }
  }

  return {
    loading,
    error,
    lastFetchedAt,
    fetch,
  };
}
