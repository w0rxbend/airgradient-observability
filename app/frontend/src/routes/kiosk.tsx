import {
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
} from "solid-js";
import { GaugeMetric } from "../components/GaugeMetric";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import type { ChartType } from "../components/TimeSeriesChart";
import { GaugeSkeleton, ChartSkeleton } from "../components/LoadingSkeleton";
import { ThemeToggle } from "../components/ThemeToggle";
import { fetchCurrent, fetchAllRanges } from "../lib/backend";

const METRIC_COLORS = [
  "var(--c-info)",
  "var(--metric-pm25)",
  "var(--metric-voc)",
  "var(--metric-nox)",
  "var(--metric-temperature)",
  "var(--metric-humidity)",
];

const REFRESH_MS = 5_000;
const CHART_TYPES: ChartType[] = ["line", "bar", "histogram"];

export default function Kiosk() {
  return <KioskView />;
}

export function KioskView(props: { oled?: boolean }) {
  const [tick, setTick] = createSignal(0);
  const chartTypes = Array.from({ length: METRIC_COLORS.length }, randomChartType);

  const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
  onCleanup(() => clearInterval(timer));

  const [current] = createResource(tick, () => fetchCurrent());
  const [allHistory] = createResource(tick, () => fetchAllRanges("24h"));

  const clock = createMemo(() => {
    // re-reads every tick so the time stays current
    tick();
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  });

  const lastSeen = createMemo(() => {
    const ts = current()?.timestamp;
    if (!ts) return "—";
    const diff = Date.now() - ts;
    if (diff < 120_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  return (
    <div class={props.oled ? "kiosk kiosk-oled" : "kiosk"}>
      {/* ── Gauges ─────────────────────────────────────────────── */}
      <Switch>
        <Match when={current.loading && !current()}>
          <GaugeSkeleton count={6} />
        </Match>
        <Match when={current.error}>
          <div class="error-box">Cannot reach backend.</div>
        </Match>
        <Match when={current()}>
          <section class="kiosk-gauge-grid" aria-label="Current sensor readings">
            <For each={current()!.metrics}>
              {(item) => <GaugeMetric metric={item} />}
            </For>
          </section>
        </Match>
      </Switch>

      {/* ── Charts ─────────────────────────────────────────────── */}
      <Switch>
        <Match when={allHistory.loading && !allHistory()}>
          <div class="kiosk-chart-grid">
            <For each={Array.from({ length: 6 })}>{() => <ChartSkeleton />}</For>
          </div>
        </Match>
        <Match when={allHistory.error}>
          <div class="error-box">Could not load chart data.</div>
        </Match>
        <Match when={allHistory()}>
          <div class="kiosk-chart-grid">
            <For each={allHistory()!}>
              {(resp, i) => (
                <TimeSeriesChart
                  label={resp.label}
                  unit={resp.unit}
                  points={resp.points}
                  color={METRIC_COLORS[i()]}
                  initialType={chartTypes[i()]}
                />
              )}
            </For>
          </div>
        </Match>
      </Switch>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer class="kiosk-footer">
        <span class="kiosk-brand">🌿 AirGradient{props.oled ? " OLED" : ""}</span>
        <span class="kiosk-status">
          <Show when={current() && !current.error}>
            <span class="status-strip-dot" style={{ "margin-right": "6px" }} />
          </Show>
          {current.loading
            ? "Connecting…"
            : current.error
              ? "Cannot reach backend"
              : `Updated ${lastSeen()}`}
          {" · "}
          Refreshes every {REFRESH_MS / 1000}s
        </span>
        <span class="kiosk-footer-actions">
          <Show when={!props.oled}>
            <ThemeToggle />
          </Show>
          <span class="kiosk-clock">{clock()}</span>
        </span>
      </footer>
    </div>
  );
}

function randomChartType(): ChartType {
  return CHART_TYPES[Math.floor(Math.random() * CHART_TYPES.length)];
}
