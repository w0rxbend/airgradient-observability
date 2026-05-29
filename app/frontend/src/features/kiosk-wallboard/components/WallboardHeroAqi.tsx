import { For } from "solid-js";
import { aqiInfo } from "../../../shared/domain/airQuality";
import { ArcGauge } from "./WallboardCharts";

type Props = { value: number };

export function WallboardHeroAqi(props: Props) {
  const info = () => aqiInfo(props.value);

  return (
    <div class="ks-card ks-hero">
      <div class="ks-card-hl" />
      <div class="ks-card-header">
        <div class="ks-card-title">
          <span class="ks-index">/ 01</span> Air Quality Index
        </div>
        <span class="ks-tag ks-live"><span class="ks-led" /> LIVE</span>
      </div>
      <div class="ks-aqi-wrap">
        <div class="ks-aqi-number-wrap">
          <div
            class="ks-aqi-status"
            style={{
              color: info().color,
              background: `color-mix(in srgb, ${info().color} 14%, transparent)`,
              "border-color": `color-mix(in srgb, ${info().color} 35%, transparent)`,
            }}
          >
            <span class="ks-led" style={{ background: info().color, "box-shadow": `0 0 8px ${info().color}` }} />
            {info().label}
          </div>
          <div class="ks-aqi-number">
            {Math.round(props.value)}<span class="ks-aqi-unit">US AQI</span>
          </div>
          <div class="ks-aqi-blurb">{info().msg}</div>
          <div class="ks-ramp" style={{ "margin-top": "10px" }}>
            <For each={[1, 2, 3, 4, 5, 6]}>
              {(i) => (
                <i class={info().step >= i ? "ks-on" : ""} style={{ background: `var(--ks-aqi-${i})` }} />
              )}
            </For>
          </div>
        </div>
        <div class="ks-gauge">
          <ArcGauge value={props.value} max={300} size={220} thick={16} />
        </div>
      </div>
    </div>
  );
}
