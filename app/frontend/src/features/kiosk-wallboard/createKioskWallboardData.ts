import { createMemo } from "solid-js";
import {
  fetchAllRanges,
  fetchCurrent,
  fetchRangeRaw,
} from "../../shared/api/backendClient";
import { createPollingResource } from "../../shared/solid/pollingResource";

export const wallboardRefreshMs = 5_000;

export function createKioskWallboardData() {
  const currentMetrics = createPollingResource(fetchCurrent, wallboardRefreshMs);
  const history = createPollingResource(() => fetchAllRanges("24h"), wallboardRefreshMs);
  const weekly = createPollingResource(
    () => fetchRangeRaw("pm25", "7d", "1h"),
    wallboardRefreshMs
  );

  return {
    current: currentMetrics.resource,
    currentData: createMemo(() => currentMetrics.latest()),
    historyData: createMemo(() => history.latest()),
    weeklyRaw: createMemo(() => weekly.latest()),
  };
}
