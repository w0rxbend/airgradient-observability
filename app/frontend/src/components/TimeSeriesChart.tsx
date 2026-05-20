import { For, Show } from "solid-js";
import type { RangePoint } from "../lib/backend";

type TimeSeriesChartProps = {
  label: string;
  unit: string;
  points: RangePoint[];
};

const width = 900;
const height = 320;
const padding = 36;

export function TimeSeriesChart(props: TimeSeriesChartProps) {
  const path = () => buildPath(props.points);
  const domain = () => getDomain(props.points);

  return (
    <section class="chart-panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">History</p>
          <h2>{props.label}</h2>
        </div>
        <span>{props.unit}</span>
      </div>

      <Show when={props.points.length > 1} fallback={<div class="empty-state">Waiting for range data</div>}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${props.label} time series`}>
          <For each={[0, 1, 2, 3]}>
            {(tick) => {
              const y = padding + tick * ((height - padding * 2) / 3);
              return <line x1={padding} x2={width - padding} y1={y} y2={y} class="grid-line" />;
            }}
          </For>
          <path d={path()} class="series-line" />
          <text x={padding} y={24} class="axis-label">
            {domain().max.toFixed(1)}
          </text>
          <text x={padding} y={height - 8} class="axis-label">
            {domain().min.toFixed(1)}
          </text>
        </svg>
      </Show>
    </section>
  );
}

function buildPath(points: RangePoint[]) {
  if (points.length < 2) return "";
  const { minX, maxX, min, max } = getDomain(points);
  const spanX = maxX - minX || 1;
  const spanY = max - min || 1;

  return points
    .map(([timestamp, value], index) => {
      const x = padding + ((timestamp - minX) / spanX) * (width - padding * 2);
      const y = height - padding - ((value - min) / spanY) * (height - padding * 2);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function getDomain(points: RangePoint[]) {
  const xs = points.map(([timestamp]) => timestamp);
  const ys = points.map(([, value]) => value);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const paddingY = (max - min || 1) * 0.1;

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    min: min - paddingY,
    max: max + paddingY
  };
}
