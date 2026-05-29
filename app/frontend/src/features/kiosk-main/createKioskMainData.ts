import { createMemo } from "solid-js";
import { fetchCurrent } from "../../shared/api/backendClient";
import { createPollingResource } from "../../shared/solid/pollingResource";

export const mainKioskRefreshMs = 5_000;

export function createKioskMainData() {
  const currentMetrics = createPollingResource(fetchCurrent, mainKioskRefreshMs);

  return {
    current: currentMetrics.resource,
    displayed: createMemo(() => currentMetrics.latest()),
    hasStaleCurrent: currentMetrics.hasStaleValue,
  };
}
