import {
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  Show,
  Suspense,
  Switch
} from "solid-js";
import { GaugeMetric } from "../components/GaugeMetric";
import { RangeSelector } from "../components/RangeSelector";
import type { RangeKey } from "../components/RangeSelector";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { AirQualityScore } from "../components/AirQualityScore";
import { AirQualityHeatmap } from "../components/AirQualityHeatmap";
import { GaugeSkeleton, ChartSkeleton } from "../components/LoadingSkeleton";
import {
  fetchCurrent,
  fetchAllRanges,
  fetchAllRangesAbsolute,
  fetchDailyScores
} from "../lib/backend";

// Color palette — one per metric, in definition order
const METRIC_COLORS = [
  "var(--c-info)",    // co2
  "#f59e0b",          // pm25
  "#a78bfa",          // voc
  "#fb923c",          // nox
  "#f43f5e",          // temperature
  "#60a5fa",          // humidity
];

export default function Dashboard() {
  const [range, setRange] = createSignal<RangeKey>("24h");
  const [selectedDate, setSelectedDate] = createSignal<Date | null>(null);

  const isHistorical = createMemo(() => selectedDate() !== null);

  // ── live current readings (gauges) ──────────────────────────────
  const [current] = createResource(fetchCurrent);

  // ── date window for absolute queries ────────────────────────────
  const dateWindow = createMemo(() => {
    const d = selectedDate();
    if (!d) return null;
    const from = new Date(d); from.setHours(0, 0, 0, 0);
    const to   = new Date(d); to.setHours(23, 59, 59, 999);
    return { from: from.getTime(), to: to.getTime() };
  });

  // ── all 6 metric time-series ─────────────────────────────────────
  const [allHistory] = createResource(
    () => {
      const w = dateWindow();
      return w
        ? { type: "absolute" as const, from: w.from, to: w.to }
        : { type: "relative" as const, range: range() };
    },
    (params) =>
      params.type === "absolute"
        ? fetchAllRangesAbsolute(params.from, params.to)
        : fetchAllRanges(params.range)
  );

  // ── heatmap daily scores ─────────────────────────────────────────
  const [dailyScores] = createResource(fetchDailyScores);

  // ── derived helpers ──────────────────────────────────────────────
  const lastSeen = createMemo(() => {
    const ts = current()?.timestamp;
    if (!ts) return "—";
    const diff = Date.now() - ts;
    if (diff < 120_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  const selectedLabel = createMemo(() => {
    const d = selectedDate();
    if (!d) return null;
    const today     = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.getTime() === today.getTime())     return "Today";
    if (d.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  });

  function handleHeatmapSelect(date: Date | null) {
    setSelectedDate(date);
  }

  return (
    <div class="dashboard">

      {/* ── Status bar ─────────────────────────────────────────── */}
      <div class="glass-card">
        <div class="status-strip">
          <div>
            <p class="status-strip-pipeline">Data pipeline</p>
            <p class="status-strip-label">AirGradient → vmagent → VictoriaMetrics</p>
          </div>
          <div class="status-strip-time">
            <Show when={current() && !current.error}>
              <span class="status-strip-dot" />
            </Show>
            <span>
              {current.loading
                ? "Connecting…"
                : current.error
                  ? "Cannot reach backend"
                  : `Updated ${lastSeen()}`}
              {current()?.cached ? " · cached" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── AQ score + heatmap row ──────────────────────────────── */}
      <div style={{ display: "grid", "grid-template-columns": "260px 1fr", gap: "12px", "align-items": "stretch" }}>
        {/* AQ score */}
        <Switch>
          <Match when={current.loading}>
            <div class="glass-card">
              <div class="skeleton" style={{ height: "160px", margin: "16px", "border-radius": "10px" }} />
            </div>
          </Match>
          <Match when={current.error}>
            <div class="error-box" style={{ "min-height": "160px" }}>
              Backend unavailable.<br />
              Start the mock server:<br />
              <code>cd app/mock-server &amp;&amp; go run .</code>
            </div>
          </Match>
          <Match when={current()}>
            <div class="glass-card">
              <AirQualityScore metrics={current()!.metrics} />
            </div>
          </Match>
        </Switch>

        {/* Heatmap */}
        <Suspense fallback={
          <div class="glass-card">
            <div class="skeleton" style={{ height: "120px", margin: "16px", "border-radius": "10px" }} />
          </div>
        }>
          <AirQualityHeatmap
            scores={dailyScores() ?? []}
            selected={selectedDate()}
            onSelect={handleHeatmapSelect}
          />
        </Suspense>
      </div>

      {/* ── 6 Gauge cards ──────────────────────────────────────── */}
      <div>
        <div class="section-header" style={{ "margin-bottom": "10px" }}>
          <span class="section-title">Live readings</span>
          <Show when={isHistorical()}>
            <span class="mode-toggle">
              Viewing historical data for <span class="mode-label">{selectedLabel()}</span>
              <button
                type="button"
                class="icon-btn"
                style={{ "margin-left": "8px" }}
                onClick={() => setSelectedDate(null)}
              >
                ↺ Live
              </button>
            </span>
          </Show>
        </div>

        <Switch>
          <Match when={current.loading}>
            <GaugeSkeleton count={6} />
          </Match>
          <Match when={current.error}>
            <div class="error-box">Could not load sensor readings.</div>
          </Match>
          <Match when={current()}>
            <section class="metric-grid" aria-label="Current sensor readings">
              <For each={current()!.metrics}>
                {(item) => <GaugeMetric metric={item} />}
              </For>
            </section>
          </Match>
        </Switch>
      </div>

      {/* ── Chart controls ─────────────────────────────────────── */}
      <div class="glass-card" style={{ padding: "14px 18px" }}>
        <div class="controls-row">
          <div class="controls-left">
            <span class="section-title">
              {isHistorical() ? `Trends — ${selectedLabel()}` : "Trends"}
            </span>
          </div>
          <div class="controls-right">
            <Show when={isHistorical()}>
              <button
                type="button"
                class="icon-btn"
                onClick={() => setSelectedDate(null)}
                aria-label="Return to live view"
              >
                ↺ Back to live
              </button>
            </Show>
            <Show when={!isHistorical()}>
              <RangeSelector value={range()} onChange={setRange} />
            </Show>
          </div>
        </div>
      </div>

      {/* ── 6 Charts ───────────────────────────────────────────── */}
      <Switch>
        <Match when={allHistory.loading}>
          <div class="chart-grid">
            <For each={Array.from({ length: 6 })}>
              {() => <ChartSkeleton />}
            </For>
          </div>
        </Match>
        <Match when={allHistory.error}>
          <div class="error-box">Could not load chart data: {String(allHistory.error)}</div>
        </Match>
        <Match when={allHistory()}>
          <div class="chart-grid">
            <For each={allHistory()!}>
              {(resp, i) => (
                <TimeSeriesChart
                  label={resp.label}
                  unit={resp.unit}
                  points={resp.points}
                  color={METRIC_COLORS[i()]}
                />
              )}
            </For>
          </div>
        </Match>
      </Switch>

    </div>
  );
}
