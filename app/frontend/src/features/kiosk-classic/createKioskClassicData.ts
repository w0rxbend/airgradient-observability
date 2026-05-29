import { createMemo } from "solid-js";
import { fetchAllRanges, fetchCurrent } from "../../shared/api/backendClient";
import { createPollingResource } from "../../shared/solid/pollingResource";

export const classicKioskRefreshMs = 5_000;

export function createKioskClassicData() {
  const currentMetrics = createPollingResource(fetchCurrent, classicKioskRefreshMs);
  const history = createPollingResource(() => fetchAllRanges("24h"), classicKioskRefreshMs);

  return {
    current: currentMetrics.resource,
    currentData: createMemo(() => currentMetrics.latest()),
    history: history.resource,
    historyData: createMemo(() => history.latest()),
    hasStaleCurrent: currentMetrics.hasStaleValue,
  };
}
