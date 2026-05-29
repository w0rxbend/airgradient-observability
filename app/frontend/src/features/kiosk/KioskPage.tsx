import { createMemo, For, Match, Show, Switch } from "solid-js";
import { GaugeMetric } from "../../components/GaugeMetric";
import { ChartSkeleton, GaugeSkeleton } from "../../components/LoadingSkeleton";
import { ThemeToggle } from "../../components/ThemeToggle";
import { TimeSeriesChart, type ChartType } from "../../components/TimeSeriesChart";
import { fetchAllRanges, fetchCurrent } from "../../shared/api/backendClient";
import { createPollingResource } from "../../shared/solid/pollingResource";
import { createClock, formatRelativeAge } from "../../shared/time/clock";

const refreshMs = 5_000;

const metricColors = [
  "var(--c-info)",
  "var(--metric-pm25)",
  "var(--metric-voc)",
  "var(--metric-nox)",
  "var(--metric-temperature)",
  "var(--metric-humidity)",
];

const chartTypesByIndex: ChartType[] = ["line", "bar", "histogram", "line", "bar", "histogram"];

export default function KioskPage() {
  return <KioskView />;
}

export function KioskView(props: { oled?: boolean }) {
  const now = createClock();
  const currentMetrics = createPollingResource(fetchCurrent, refreshMs);
  const history = createPollingResource(() => fetchAllRanges("24h"), refreshMs);

  const current = currentMetrics.resource;
  const currentData = createMemo(() => currentMetrics.latest());
  const allHistory = history.resource;
  const historyData = createMemo(() => history.latest());

  const clock = createMemo(() =>
    now().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  );

  const lastSeen = createMemo(() => formatRelativeAge(currentData()?.timestamp));

  return (
    <div class={props.oled ? "kiosk kiosk-oled" : "kiosk"}>
      <Switch>
        <Match when={current.loading && !currentData()}>
          <GaugeSkeleton count={6} />
        </Match>
        <Match when={current.error && !currentData()}>
          <div class="error-box">Cannot reach backend.</div>
        </Match>
        <Match when={currentData()}>
          {(data) => (
            <section class="kiosk-gauge-grid" aria-label="Current sensor readings">
              <For each={data().metrics}>{(item) => <GaugeMetric metric={item} />}</For>
            </section>
          )}
        </Match>
      </Switch>

      <Switch>
        <Match when={allHistory.loading && !historyData()}>
          <div class="kiosk-chart-grid">
            <For each={Array.from({ length: 6 })}>{() => <ChartSkeleton />}</For>
          </div>
        </Match>
        <Match when={allHistory.error && !historyData()}>
          <div class="error-box">Could not load chart data.</div>
        </Match>
        <Match when={historyData()}>
          {(data) => (
            <div class="kiosk-chart-grid">
              <For each={data()}>
                {(resp, index) => (
                  <TimeSeriesChart
                    label={resp.label}
                    unit={resp.unit}
                    points={resp.points}
                    color={metricColors[index()]}
                    initialType={chartTypesByIndex[index()] ?? "line"}
                  />
                )}
              </For>
            </div>
          )}
        </Match>
      </Switch>

      <footer class="kiosk-footer">
        <span class="kiosk-brand">AG AirGradient{props.oled ? " OLED" : ""}</span>
        <span class="kiosk-status">
          <Show when={currentData() && !current.error}>
            <span class="status-strip-dot" style={{ "margin-right": "6px" }} />
          </Show>
          {current.loading && !currentData()
            ? "Connecting..."
            : current.error
              ? currentMetrics.hasStaleValue()
                ? `Last good sample ${lastSeen()}`
                : "Cannot reach backend"
              : `Updated ${lastSeen()}`}
          {" - "}
          Refreshes every {refreshMs / 1000}s
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
