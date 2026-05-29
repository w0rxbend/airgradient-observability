import { For } from "solid-js";
import { Sparkline } from "./WallboardCharts";

type Props = {
  tileClass: string;
  idx:       number;
  label:     string;
  value:     string;
  unit:      string;
  sub:       string;
  statusTxt: string;
  color:     string;
  series:    number[];
  rampStep:  number;
};

export function WallboardStatTile(props: Props) {
  return (
    <div class={`ks-card ${props.tileClass}`} style={{ color: props.color }}>
      <div class="ks-card-hl" />
      <div class="ks-card-header">
        <div class="ks-card-title">
          <span class="ks-index">/ {String(props.idx).padStart(2, "0")}</span> {props.label}
        </div>
        <span
          class="ks-tag"
          style={{
            color: props.color,
            "border-color": `color-mix(in srgb, ${props.color} 40%, transparent)`,
          }}
        >
          <span class="ks-led" style={{ background: props.color, "box-shadow": `0 0 8px ${props.color}` }} />
          {props.statusTxt}
        </span>
      </div>
      <div class="ks-stat-value" style={{ color: "var(--ks-paper-0)" }}>
        {props.value}<span class="ks-unit">{props.unit}</span>
      </div>
      <div class="ks-sub">{props.sub}</div>
      <div class="ks-stat-spark">
        <Sparkline data={props.series} color={props.color} height={48} stroke={1.6} />
      </div>
      <div class="ks-ramp">
        <For each={[1, 2, 3, 4, 5, 6]}>
          {(i) => (
            <i class={props.rampStep >= i ? "ks-on" : ""} style={{ background: `var(--ks-aqi-${i})` }} />
          )}
        </For>
      </div>
    </div>
  );
}
