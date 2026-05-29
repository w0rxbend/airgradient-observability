import { Sparkline } from "./WallboardCharts";

type Props = { value: number; series: number[] };

export function WallboardTemperatureCard(props: Props) {
  const hi = () => props.series.length ? Math.max(...props.series).toFixed(1) : "—";
  const lo = () => props.series.length ? Math.min(...props.series).toFixed(1) : "—";

  return (
    <div class="ks-card ks-temp" style={{ color: "var(--ks-amber)" }}>
      <div class="ks-card-hl" />
      <div class="ks-card-header">
        <div class="ks-card-title"><span class="ks-index">/ 09</span> Temperature</div>
        <span class="ks-tag" style={{ color: "var(--ks-amber)", "border-color": "color-mix(in srgb, var(--ks-amber) 40%, transparent)" }}>
          <span class="ks-led" style={{ background: "var(--ks-amber)", "box-shadow": "0 0 8px var(--ks-amber)" }} /> INDOOR
        </span>
      </div>
      <div class="ks-bigreading">
        <div class="ks-bigreading-sub">LIVING ROOM · SENSOR</div>
        <div class="ks-bigreading-value">
          {props.value.toFixed(1)}<span class="ks-bigreading-unit">°C</span>
        </div>
        <Sparkline data={props.series} color="var(--ks-amber)" height={44} stroke={1.8} />
        <div class="ks-bigreading-row">
          <span>HIGH <b>{hi()}°</b></span>
          <span>LOW  <b>{lo()}°</b></span>
          <span>FEELS <b>{(props.value + 0.6).toFixed(1)}°</b></span>
        </div>
      </div>
    </div>
  );
}
