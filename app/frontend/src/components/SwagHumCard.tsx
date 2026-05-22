import { Sparkline } from "./SwagCharts";

type Props = { value: number; series: number[] };

export function SwagHumCard(props: Props) {
  const status = () => props.value < 30 ? "DRY" : props.value > 60 ? "HUMID" : "OPTIMAL";
  const color  = () =>
    props.value < 30 ? "var(--ks-amber)" :
    props.value > 60 ? "var(--ks-diia)"  :
                       "var(--ks-green)";

  return (
    <div class="ks-card ks-hum" style={{ color: color() }}>
      <div class="ks-card-hl" />
      <div class="ks-card-header">
        <div class="ks-card-title"><span class="ks-index">/ 10</span> Humidity</div>
        <span
          class="ks-tag"
          style={{ color: color(), "border-color": `color-mix(in srgb, ${color()} 40%, transparent)` }}
        >
          <span class="ks-led" style={{ background: color(), "box-shadow": `0 0 8px ${color()}` }} />
          {status()}
        </span>
      </div>
      <div class="ks-bigreading">
        <div class="ks-bigreading-sub">RELATIVE HUMIDITY</div>
        <div class="ks-bigreading-value">
          {props.value.toFixed(0)}<span class="ks-bigreading-unit">%</span>
        </div>
        <Sparkline data={props.series} color={color()} height={44} stroke={1.8} />
        <div class="ks-bigreading-row">
          <span>TARGET <b>40–60%</b></span>
          <span>STATUS <b>{status()}</b></span>
        </div>
      </div>
    </div>
  );
}
