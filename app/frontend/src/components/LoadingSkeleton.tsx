import { For } from "solid-js";

type GaugeSkeletonProps = { count?: number };

export function GaugeSkeleton(props: GaugeSkeletonProps) {
  const count = () => props.count ?? 6;
  return (
    <section class="metric-grid" aria-busy="true" aria-label="Loading metrics">
      <For each={Array.from({ length: count() })}>
        {() => <div class="skeleton skeleton-card" />}
      </For>
    </section>
  );
}

export function ChartSkeleton() {
  return (
    <div class="skeleton skeleton-chart" aria-busy="true" aria-label="Loading chart" />
  );
}
