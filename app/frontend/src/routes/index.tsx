import {
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  Show,
  Switch
} from "solid-js";
import { GaugeMetric } from "../components/GaugeMetric";
import { RangeSelector } from "../components/RangeSelector";
import type { RangeKey } from "../components/RangeSelector";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import { AirQualityScore } from "../components/AirQualityScore";
import { CalendarPicker } from "../components/CalendarPicker";
import { GaugeSkeleton, ChartSkeleton } from "../components/LoadingSkeleton";
import type { MetricKey } from "../lib/metrics";
import { fetchCurrent, fetchRange, fetchRangeAbsolute } from "../lib/backend";
import { statusColor } from "../lib/thresholds";
import type { Status } from "../lib/thresholds";

const METRIC_OPTIONS: Array<{ key: MetricKey; label: string }> = [
  { key: "co2", label: "CO₂" },
  { key: "pm25", label: "PM2.5" },
  { key: "voc", label: "VOC" },
  { key: "nox", label: "NOx" },
  { key: "temperature", label: "Temp" },
  { key: "humidity", label: "Humidity" }
];

export default function Dashboard() {
  const [range, setRange] = createSignal<RangeKey>("24h");
  const [metric, setMetric] = createSignal<MetricKey>("co2");
  const [selectedDate, setSelectedDate] = createSignal<Date | null>(null);
  const [showCalendar, setShowCalendar] = createSignal(false);

  const isHistorical = createMemo(() => selectedDate() !== null);

  const [current] = createResource(fetchCurrent);

  // Historical date window: midnight → midnight local
  const dateWindow = createMemo(() => {
    const d = selectedDate();
    if (!d) return null;
    const from = new Date(d);
    from.setHours(0, 0, 0, 0);
    const to = new Date(d);
    to.setHours(23, 59, 59, 999);
    return { from: from.getTime(), to: to.getTime() };
  });

  const [history] = createResource(
    () => {
      const w = dateWindow();
      if (w) {
        return { type: "absolute" as const, metric: metric(), from: w.from, to: w.to };
      }
      return { type: "relative" as const, metric: metric(), range: range() };
    },
    async (params) => {
      if (params.type === "absolute") {
        return fetchRangeAbsolute(params.metric, params.from, params.to);
      }
      return fetchRange(params.metric, params.range);
    }
  );

  const lastSeen = createMemo(() => {
    const ts = current()?.timestamp;
    if (!ts) return "No data";
    const diff = Date.now() - ts;
    if (diff < 120_000) return "just now";
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  const activeMetricColor = createMemo(() => {
    const metrics = current()?.metrics ?? [];
    const m = metrics.find(x => x.key === metric());
    return m ? statusColor(m.status as Status) : "var(--c-info)";
  });

  const selectedDateLabel = createMemo(() => {
    const d = selectedDate();
    if (!d) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.getTime() === today.getTime()) return "Today";
    if (d.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  });

  return (
    <div class="dashboard">
      {/* Status strip */}
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
                ? "Error loading data"
                : `Updated ${lastSeen()}`}
              {current()?.cached ? " · cached" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Air quality score */}
      <Switch>
        <Match when={current.loading}>
          <div class="glass-card">
            <div class="skeleton" style={{ height: "120px", margin: "16px", "border-radius": "10px" }} />
          </div>
        </Match>
        <Match when={current.error}>
          <div class="error-box">{String(current.error)}</div>
        </Match>
        <Match when={current()}>
          <div class="glass-card">
            <AirQualityScore metrics={current()!.metrics} />
          </div>
        </Match>
      </Switch>

      {/* Gauge grid */}
      <Switch>
        <Match when={current.loading}>
          <GaugeSkeleton count={6} />
        </Match>
        <Match when={current.error}>
          <div class="error-box">Could not load sensor metrics: {String(current.error)}</div>
        </Match>
        <Match when={current()}>
          <section class="metric-grid" aria-label="Current sensor readings">
            <For each={current()!.metrics}>
              {(item) => <GaugeMetric metric={item} />}
            </For>
          </section>
        </Match>
      </Switch>

      {/* Chart controls */}
      <div class="glass-card" style={{ padding: "16px 18px" }}>
        <div class="controls-row">
          <div class="controls-left">
            {/* Metric tabs */}
            <div class="segmented" role="group" aria-label="Metric to chart">
              <For each={METRIC_OPTIONS}>
                {(opt) => (
                  <button
                    type="button"
                    class={metric() === opt.key ? "active" : ""}
                    aria-pressed={metric() === opt.key}
                    onClick={() => setMetric(opt.key)}
                  >
                    {opt.label}
                  </button>
                )}
              </For>
            </div>
          </div>

          <div class="controls-right">
            {/* Live range selector — hidden in historical mode */}
            <Show when={!isHistorical()}>
              <RangeSelector value={range()} onChange={setRange} />
            </Show>

            {/* Historical mode indicator */}
            <Show when={isHistorical()}>
              <span class="mode-toggle">
                <span>Viewing:</span>
                <span class="mode-label">{selectedDateLabel()}</span>
              </span>
            </Show>

            {/* Calendar toggle */}
            <button
              type="button"
              class={`icon-btn ${showCalendar() ? "active" : ""}`}
              onClick={() => setShowCalendar(s => !s)}
              aria-expanded={showCalendar()}
              aria-label="Toggle calendar date picker"
            >
              📅 {isHistorical() ? selectedDateLabel() : "History"}
            </button>
          </div>
        </div>

        {/* Calendar drawer */}
        <Show when={showCalendar()}>
          <div style={{ "margin-top": "16px", "border-top": "1px solid var(--border-subtle)", "padding-top": "16px" }}>
            <CalendarPicker
              selected={selectedDate()}
              onSelect={(d) => {
                setSelectedDate(d);
                if (!d) setShowCalendar(false);
              }}
            />
          </div>
        </Show>
      </div>

      {/* Time series chart */}
      <Switch>
        <Match when={history.loading}>
          <ChartSkeleton />
        </Match>
        <Match when={history.error}>
          <div class="error-box">Could not load chart data: {String(history.error)}</div>
        </Match>
        <Match when={history()}>
          <TimeSeriesChart
            label={history()!.label}
            unit={history()!.unit}
            points={history()!.points}
            color={activeMetricColor()}
          />
        </Match>
      </Switch>
    </div>
  );
}
