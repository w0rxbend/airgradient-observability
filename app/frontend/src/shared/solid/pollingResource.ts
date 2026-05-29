import { createEffect, createResource, createSignal, onCleanup, onMount } from "solid-js";

export function createPollingResource<T>(fetcher: () => Promise<T>, intervalMs: number) {
  const [tick, setTick] = createSignal(0);
  const [latest, setLatest] = createSignal<T>();

  const [resource] = createResource(tick, () => fetcher());

  onMount(() => {
    const timer = setInterval(() => setTick((value) => value + 1), intervalMs);
    onCleanup(() => clearInterval(timer));
  });

  createEffect(() => {
    const next = resource();
    if (next !== undefined) setLatest(() => next);
  });

  return {
    resource,
    latest,
    hasStaleValue: () => Boolean(resource.error && latest()),
  };
}
