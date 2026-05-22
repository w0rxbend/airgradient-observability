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
import { ThemeToggle } from "../components/ThemeToggle";
import {
  fetchCurrent,
  fetchAllRanges,
  fetchAllRangesAbsolute,
  fetchDailyScores
} from "../lib/backend";

const METRIC_COLORS = [
  "var(--c-info)",
  "var(--metric-pm25)",
  "var(--metric-voc)",
  "var(--metric-nox)",
  "var(--metric-temperature)",
  "var(--metric-humidity)",
];

const METRIC_DISPLAY = [
  {
    key: "temperature",
    color: "var(--metric-temperature)",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <rect x="10" y="2" width="4" height="13" rx="2" />
        <circle cx="12" cy="18" r="5" />
        <rect x="11" y="8" width="2" height="9" rx="1" fill="rgba(0,0,0,0.3)" />
      </svg>
    ),
  },
  {
    key: "humidity",
    color: "var(--metric-humidity)",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C10 7 4 12 4 16a8 8 0 0016 0c0-4-6-9-8-14z" />
      </svg>
    ),
  },
  {
    key: "co2",
    color: "var(--c-info)",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 10c0-3.3-2.7-6-6-6a6 6 0 00-5.7 4.1A4 4 0 105 16h14a4 4 0 000-8z" />
      </svg>
    ),
  },
  {
    key: "pm25",
    color: "var(--metric-pm25)",
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="7"  cy="8"  r="3"   opacity="0.9" />
        <circle cx="15" cy="6"  r="2"   opacity="0.7" />
        <circle cx="17" cy="14" r="3.5" opacity="0.85" />
        <circle cx="7"  cy="15" r="2.5" opacity="0.75" />
        <circle cx="12" cy="11" r="2"   opacity="0.6" />
      </svg>
    ),
  },
];

function fmtMetricVal(v: number | null): string {
  if (v === null) return "—";
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
}

export default function Dashboard() {
  const [range, setRange] = createSignal<RangeKey>("24h");
  const [selectedDate, setSelectedDate] = createSignal<Date | null>(null);

  const isHistorical = createMemo(() => selectedDate() !== null);

  const [current] = createResource(fetchCurrent);

  const dateWindow = createMemo(() => {
    const d = selectedDate();
    if (!d) return null;
    const from = new Date(d);
    from.setHours(0, 0, 0, 0);
    const to = new Date(d);
    to.setHours(23, 59, 59, 999);
    return { from: from.getTime(), to: to.getTime() };
  });

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

  const [dailyScores] = createResource(fetchDailyScores);

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

  const selectedLabel = createMemo(() => {
    const d = selectedDate();
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.getTime() === today.getTime()) return "Today";
    if (d.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  });

  return (
    <div class="shell">
      <header class="topbar">
        <div class="topbar-brand">
          <div class="topbar-icon" aria-hidden="true">
            🌿
          </div>
          <div>
            <div class="topbar-title">AirGradient</div>
            <div class="topbar-subtitle">Indoor air quality observability</div>
          </div>
        </div>
        <div class="topbar-actions">
          <ThemeToggle />
          <a href="/api/healthz" class="api-link" aria-label="Backend health check">
            Backend status
          </a>
        </div>
      </header>

      <div class="dashboard">
        {/* ── Status monitor ──────────────────────────────────── */}
        <div
          class="status-monitor glass-card"
          style={{
            background: current.error
              ? "linear-gradient(135deg, rgba(239,68,68,0.08) 0%, transparent 60%)"
              : current()
                ? "linear-gradient(135deg, rgba(34,197,94,0.07) 0%, transparent 60%)"
                : undefined,
          }}
        >
          {/* Device */}
          <div class="status-monitor-device">
            <div class="status-monitor-device-icon">📡</div>
            <div>
              <p class="status-monitor-device-name">AirGradient ONE</p>
              <p class="status-monitor-device-type">Indoor air sensor</p>
            </div>
          </div>

          {/* Metrics infographic */}
          <Show when={current() && !current.error}>
            <div class="status-metrics">
              <For each={METRIC_DISPLAY}>
                {({ key, color, icon }) => {
                  const m = () => current()!.metrics.find((x) => x.key === key);
                  return (
                    <Show when={m()}>
                      <div class="status-metric-card">
                        <span class="status-metric-icon" style={{ color }}>
                          {icon()}
                        </span>
                        <div class="status-metric-body">
                          <span class="status-metric-value">{fmtMetricVal(m()!.value)}</span>
                          <span class="status-metric-unit">{m()!.unit}</span>
                        </div>
                      </div>
                    </Show>
                  );
                }}
              </For>
            </div>
          </Show>

          {/* Status */}
          <div class="status-monitor-right">
            <Show when={current() && !current.error}>
              <span class="status-strip-dot" />
            </Show>
            <span class="status-monitor-time">
              {current.loading
                ? "Connecting…"
                : current.error
                  ? "Offline"
                  : `Updated ${lastSeen()}`}
              {current()?.cached ? " · cached" : ""}
            </span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            "grid-template-columns": "auto 1fr",
            gap: "12px",
            "align-items": "stretch",
          }}
        >
          <Switch>
            <Match when={current.loading}>
              <div class="glass-card">
                <div
                  class="skeleton"
                  style={{
                    height: "160px",
                    margin: "16px",
                    "border-radius": "10px",
                  }}
                />
              </div>
            </Match>
            <Match when={current.error}>
              <div class="error-box" style={{ "min-height": "160px" }}>
                Backend unavailable.
                <br />
                Start the mock server:
                <br />
                <code>cd app/mock-server &amp;&amp; go run .</code>
              </div>
            </Match>
            <Match when={current()}>
              <div class="glass-card">
                <AirQualityScore metrics={current()!.metrics} />
              </div>
            </Match>
          </Switch>

          <Suspense
            fallback={
              <div class="glass-card">
                <div
                  class="skeleton"
                  style={{
                    height: "120px",
                    margin: "16px",
                    "border-radius": "10px",
                  }}
                />
              </div>
            }
          >
            <AirQualityHeatmap
              scores={dailyScores() ?? []}
              selected={selectedDate()}
              onSelect={(date) => setSelectedDate(date)}
            />
          </Suspense>
        </div>

        <div>
          <div class="section-header" style={{ "margin-bottom": "10px" }}>
            <span class="section-title">Live readings</span>
            <Show when={isHistorical()}>
              <span class="mode-toggle">
                Viewing historical data for{" "}
                <span class="mode-label">{selectedLabel()}</span>
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

        <Switch>
          <Match when={allHistory.loading}>
            <div class="chart-grid">
              <For each={Array.from({ length: 6 })}>
                {() => <ChartSkeleton />}
              </For>
            </div>
          </Match>
          <Match when={allHistory.error}>
            <div class="error-box">
              Could not load chart data: {String(allHistory.error)}
            </div>
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
    </div>
  );
}
