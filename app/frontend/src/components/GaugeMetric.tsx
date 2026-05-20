import { Show } from "solid-js";
import type { CurrentMetric } from "../lib/backend";

type GaugeMetricProps = {
  metric: CurrentMetric;
};

export function GaugeMetric(props: GaugeMetricProps) {
  const percent = () => {
    const value = props.metric.value;
    if (value === null) return 0;
    const range = props.metric.max - props.metric.min || 1;
    return Math.max(0, Math.min(100, ((value - props.metric.min) / range) * 100));
  };

  const style = () => ({
    "--gauge-value": `${percent() * 1.8}deg`
  });

  return (
    <article class={`gauge-card ${props.metric.status}`} style={style()}>
      <div class="gauge-header">
        <div>
          <span>{props.metric.label}</span>
          <small>{props.metric.unit}</small>
        </div>
        <i>{labelForStatus(props.metric.status)}</i>
      </div>

      <div class="gauge-arc" aria-hidden="true">
        <div class="gauge-inner">
          <strong>
            <Show when={props.metric.value !== null} fallback="--">
              {formatValue(props.metric.value)}
            </Show>
          </strong>
          <small>{props.metric.unit}</small>
        </div>
      </div>

      <footer>
        <span>{props.metric.min}</span>
        <span>{props.metric.timestamp ? new Date(props.metric.timestamp).toLocaleTimeString() : "No data"}</span>
        <span>{props.metric.max}</span>
      </footer>
    </article>
  );
}

function formatValue(value: number | null) {
  if (value === null) return "--";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

function labelForStatus(status: CurrentMetric["status"]) {
  switch (status) {
    case "critical":
      return "High";
    case "warning":
      return "Watch";
    case "empty":
      return "Quiet";
    default:
      return "Good";
  }
}
