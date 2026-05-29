import { createSignal, onCleanup, onMount } from "solid-js";

export function createClock(intervalMs = 1_000) {
  const [now, setNow] = createSignal(new Date());

  onMount(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    onCleanup(() => clearInterval(timer));
  });

  return now;
}

export function formatRelativeAge(timestamp: number | null | undefined, now = Date.now()) {
  if (!timestamp) return "-";

  const diff = now - timestamp;
  if (diff < 120_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;

  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
