import { createMemo } from "solid-js";
import { fetchAllRanges, fetchCurrent } from "../../shared/api/backendClient";
import { createPollingResource } from "../../shared/solid/pollingResource";

export const gaugesRefreshMs = 5_000;

export function createKioskGaugesData() {
  const currentMetrics = createPollingResource(fetchCurrent, gaugesRefreshMs);
  const history = createPollingResource(() => fetchAllRanges("24h"), gaugesRefreshMs);

  return {
    current: currentMetrics.resource,
    currentData: createMemo(() => currentMetrics.latest()),
    historyData: createMemo(() => history.latest()),
  };
}
