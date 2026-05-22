import { Show } from "solid-js";
import { MultiLine } from "./SwagCharts";

type Props = { pm25: number[]; voc: number[] };

export function SwagTrendCard(props: Props) {
  const series = () => [
    { name: "PM2.5", data: props.pm25,                color: "var(--ks-signal)" },
    { name: "VOC",   data: props.voc.map(v => v / 6), color: "var(--ks-amber)"  },
  ];

  const avg  = () => props.pm25.length
    ? (props.pm25.reduce((a, b) => a + b, 0) / props.pm25.length).toFixed(1)
    : "—";
  const peak = () => props.pm25.length ? Math.max(...props.pm25).toFixed(0) : "—";
  const low  = () => props.pm25.length ? Math.min(...props.pm25).toFixed(0) : "—";

  return (
    <div class="ks-card ks-trend">
      <div class="ks-card-hl" />
      <div class="ks-card-header">
        <div class="ks-card-title">
          <span class="ks-index">/ 02</span> 24-hour pollutant trend
        </div>
        <div class="ks-row-flex">
          <div class="ks-legend-row">
            <span class="ks-legend-item">
              <span class="ks-legend-swatch" style={{ background: "var(--ks-signal)" }} />PM2.5
            </span>
            <span class="ks-legend-item">
              <span class="ks-legend-swatch" style={{ background: "var(--ks-amber)" }} />VOC
            </span>
          </div>
          <span class="ks-tag ks-live"><span class="ks-led" /> LIVE</span>
        </div>
      </div>
      <div style={{ flex: "1", display: "flex", "align-items": "stretch", "min-height": "0" }}>
        <MultiLine series={series()} height={185} />
      </div>
      <div class="ks-mini-stats">
        <MiniStat label="24h avg PM2.5" value={avg()}  unit="µg/m³" />
        <MiniStat label="Peak"          value={peak()} unit="µg/m³" />
        <MiniStat label="Low"           value={low()}  unit="µg/m³" />
        <MiniStat label="WHO 24h limit" value="15"     unit="µg/m³" delta="ref" />
      </div>
    </div>
  );
}

function MiniStat(props: { label: string; value: string; unit: string; delta?: string }) {
  return (
    <div class="ks-flex-col" style={{ gap: "2px" }}>
      <span class="ks-mini-stat-label">{props.label}</span>
      <span class="ks-mini-stat-value">
        {props.value} <span class="ks-mini-stat-unit">{props.unit}</span>
      </span>
      <Show when={props.delta}>
        <span class="ks-mini-stat-delta">{props.delta}</span>
      </Show>
    </div>
  );
}
