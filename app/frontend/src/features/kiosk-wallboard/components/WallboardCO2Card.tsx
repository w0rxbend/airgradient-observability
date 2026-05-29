import { clamp01 } from "../../../shared/domain/airQuality";
import { Sparkline, MiniRadial } from "./WallboardCharts";

type Props = { value: number; series: number[] };

export function WallboardCO2Card(props: Props) {
  const status = () =>
    props.value < 800  ? { txt: "OK",       color: "var(--ks-green)" } :
    props.value < 1200 ? { txt: "ELEVATED", color: "var(--ks-amber)" } :
                         { txt: "HIGH",     color: "var(--ks-r)"     };
  const pct  = () => Math.round(clamp01(props.value / 2000) * 100);
  const peak = () => props.series.length ? Math.round(Math.max(...props.series)) : "—";

  return (
    <div class="ks-card ks-stat ks-tile-co2" style={{ color: status().color }}>
      <div class="ks-card-hl" />
      <div class="ks-card-header">
        <div class="ks-card-title"><span class="ks-index">/ 04</span> CO₂ · Carbon Dioxide</div>
        <span
          class="ks-tag"
          style={{
            color: status().color,
            "border-color": `color-mix(in srgb, ${status().color} 40%, transparent)`,
          }}
        >
          <span class="ks-led" style={{ background: status().color, "box-shadow": `0 0 8px ${status().color}` }} />
          {status().txt}
        </span>
      </div>
      <div style={{ display: "grid", "grid-template-columns": "1fr auto", gap: "14px", "align-items": "center", flex: "1" }}>
        <div>
          <div class="ks-stat-value" style={{ color: "var(--ks-paper-0)", "font-size": "var(--ks-fs-co2)" }}>
            {Math.round(props.value)}<span class="ks-unit">ppm</span>
          </div>
          <div class="ks-co2-refs">
            <span>OUTDOOR <b>415</b></span>
            <span>TARGET <b>&lt;800</b></span>
            <span>PEAK 24H <b>{peak()}</b></span>
          </div>
          <div style={{ "margin-top": "10px" }}>
            <Sparkline data={props.series} color={status().color} height={30} stroke={1.5} />
          </div>
        </div>
        <div style={{ position: "relative", width: "116px", height: "116px" }}>
          <MiniRadial value={props.value} max={2000} color={status().color} size={116} thick={11} />
          <div class="ks-radial-center">
            <div style={{ "font-size": "19px", color: "var(--ks-paper-0)", "font-weight": "500", "letter-spacing": "-0.02em" }}>{pct()}%</div>
            <div style={{ "font-size": "9px", "letter-spacing": "0.1em", "text-transform": "uppercase" }}>of cap</div>
          </div>
        </div>
      </div>
    </div>
  );
}
