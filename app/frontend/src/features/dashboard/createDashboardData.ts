import { createMemo, createResource, type Accessor } from "solid-js";
import {
  fetchAllRanges,
  fetchAllRangesAbsolute,
  fetchCurrent,
  fetchDailyScores,
} from "../../shared/api/backendClient";
import type { RangeKey } from "../../shared/domain/timeRanges";
import { createPollingResource } from "../../shared/solid/pollingResource";

export const dashboardRefreshMs = 5_000;

type DateWindow = { from: number; to: number } | null;

export function createDashboardData(range: Accessor<RangeKey>, dateWindow: Accessor<DateWindow>) {
  const currentMetrics = createPollingResource(fetchCurrent, dashboardRefreshMs);

  const [allHistory] = createResource(
    () => {
      const window = dateWindow();
      return window
        ? { type: "absolute" as const, from: window.from, to: window.to }
        : { type: "relative" as const, range: range() };
    },
    (params) =>
      params.type === "absolute"
        ? fetchAllRangesAbsolute(params.from, params.to)
        : fetchAllRanges(params.range)
  );

  const [dailyScores] = createResource(fetchDailyScores);

  return {
    current: currentMetrics.resource,
    displayedCurrent: createMemo(() => currentMetrics.latest()),
    hasStaleCurrent: currentMetrics.hasStaleValue,
    allHistory,
    dailyScores,
  };
}
