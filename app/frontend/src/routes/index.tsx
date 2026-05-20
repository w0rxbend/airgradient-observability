import { createMemo, createResource, createSignal, For, Match, Switch } from "solid-js";
import { GaugeMetric } from "../components/GaugeMetric";
import { RangeSelector } from "../components/RangeSelector";
import type { RangeKey } from "../components/RangeSelector";
import { TimeSeriesChart } from "../components/TimeSeriesChart";
import type { MetricKey } from "../lib/metrics";
import { fetchCurrent, fetchRange } from "../lib/backend";

const metricOptions: Array<{ key: MetricKey; label: string }> = [
  { key: "co2", label: "CO2" },
  { key: "pm25", label: "PM2.5" },
  { key: "voc", label: "VOC" },
  { key: "nox", label: "NOx" },
  { key: "temperature", label: "Temp" },
  { key: "humidity", label: "Humidity" }
];

export default function Dashboard() {
  const [range, setRange] = createSignal<RangeKey>("24h");
  const [metric, setMetric] = createSignal<MetricKey>("co2");

  const [current] = createResource(fetchCurrent);
  const [history] = createResource(
    () => ({ range: range(), metric: metric() }),
    ({ range, metric }) => fetchRange(metric, range)
  );

  const lastSeen = createMemo(() => {
    const timestamp = current()?.timestamp;
    return timestamp ? new Date(timestamp).toLocaleString() : "No samples yet";
  });

  return (
    <div class="dashboard">
      <section class="status-strip">
        <div>
          <p class="eyebrow">Pipeline</p>
          <strong>AirGradient → vmagent → VictoriaMetrics → Go proxy</strong>
        </div>
        <span>
          Last sample: {lastSeen()}
          {current()?.cached ? " · cache hit" : ""}
        </span>
      </section>

      <Switch>
        <Match when={current.error}>
          <div class="error-box">{String(current.error)}</div>
        </Match>
        <Match when={current()}>
          <section class="metric-grid">
            <For each={current()!.metrics}>
              {(item) => <GaugeMetric metric={item} />}
            </For>
          </section>
        </Match>
      </Switch>

      <section class="controls">
        <div class="tabs" aria-label="Metric">
          <For each={metricOptions}>
            {(option) => (
              <button
                type="button"
                class={metric() === option.key ? "active" : ""}
                onClick={() => setMetric(option.key)}
              >
                {option.label}
              </button>
            )}
          </For>
        </div>
        <RangeSelector value={range()} onChange={setRange} />
      </section>

      <Switch>
        <Match when={history.error}>
          <div class="error-box">{String(history.error)}</div>
        </Match>
        <Match when={history()}>
          <TimeSeriesChart
            label={history()!.label}
            unit={history()!.unit}
            points={history()!.points}
          />
        </Match>
      </Switch>
    </div>
  );
}
