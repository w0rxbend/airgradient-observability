import type { JSX } from "solid-js";
import { Show } from "solid-js";
import { GlowGauge } from "./GlowGauge";
import { GaugeSpark } from "./GaugeSpark";

let _gaugeCardId = 0;

export type DeltaDir = "up" | "down" | "flat";

export interface GaugeCardProps {
  idx:         number;
  label:       string;
  sublabel:    string;
  value:       number | null;
  max:         number;
  min?:        number;
  unit:        string;
  statusTxt:   string;
  statusColor: string;
  prevValue:   string;
  rangeLabel:  string;
  rangeValue:  string;
  deltaText:   string;
  deltaDir:    DeltaDir;
  trend:       number[];
  icon:        JSX.Element;
  fmt?:        (v: number) => string;
}

export function GaugeCard(props: GaugeCardProps) {
  const gradId = `gg-${++_gaugeCardId}`;

  const display = () => {
    const v = props.value;
    if (v === null) return "—";
    if (props.fmt) return props.fmt(v);
    return Math.abs(v) >= 100 ? Math.round(v).toString() : v.toFixed(1);
  };

  const deltaPrefix = () => {
    if (props.deltaDir === "up")   return "↗ ";
    if (props.deltaDir === "down") return "↘ ";
    return "· ";
  };

  // Color for the sparkline — use the same tint as the status
  const sparkColor = () => {
    const c = props.statusColor;
    // Map CSS var to concrete hex for filter support
    if (c.includes("g-low"))  return "#2BD46B";
    if (c.includes("g-mid"))  return "#F2D027";
    if (c.includes("g-high")) return "#FF8A2C";
    if (c.includes("g-top"))  return "#FF3D3D";
    return "#2BD46B";
  };

  const statusBg = () =>
    `color-mix(in oklab, ${sparkColor()} 14%, transparent)`;

  const safeValue = () => props.value ?? 0;

  return (
    <div class="gi-card">
      {/* Top shimmer line */}
      <div
        class="gi-card-top"
        style={{ "--gi-shimmer-color": `${sparkColor()}b3` } as JSX.CSSProperties}
      />

      {/* Header */}
      <div class="gi-head">
        <div>
          <div class="gi-label">{props.label}</div>
          <div class="gi-sublabel">{props.sublabel}</div>
        </div>
        <div
          class="gi-status"
          style={{
            background: statusBg(),
            color: sparkColor(),
            border: `1px solid ${sparkColor()}40`,
          }}
        >
          <span
            class="gi-led"
            style={{ background: sparkColor() }}
          />
          {props.statusTxt}
        </div>
      </div>

      {/* Gauge area */}
      <div class="gi-gauge-wrap">
        {/* SVG gauge fills the entire wrap */}
        <GlowGauge
          value={safeValue()}
          color={sparkColor()}
          max={props.max}
          min={props.min}
          gradId={gradId}
        />

        {/* Overlay: icon + value + sparkline */}
        <div class="gi-gauge-inner">
          <div class="gi-icon">{props.icon}</div>
          <div class="gi-value">
            {display()}
            <span class="gi-unit">{props.unit}</span>
          </div>
          <Show when={props.trend.length > 1}>
            <div class="gi-spark">
              <GaugeSpark
                data={props.trend}
                color={sparkColor()}
                height={28}
              />
            </div>
          </Show>
        </div>
      </div>

      {/* Footer */}
      <div class="gi-foot">
        <div class="gi-stat">
          <span class="gi-stat-l">PREV</span>
          <span class="gi-stat-v">{props.prevValue}{props.unit}</span>
        </div>
        <div class="gi-stat gi-stat-c">
          <span class="gi-stat-l">{props.rangeLabel}</span>
          <span class="gi-stat-v">{props.rangeValue}</span>
        </div>
        <div class="gi-stat gi-stat-r">
          <span class="gi-stat-l">CHANGE</span>
          <span
            class="gi-stat-v"
            style={{
              color: props.deltaDir === "up"
                ? "#FF8A2C"
                : props.deltaDir === "down"
                ? "#2BD46B"
                : "var(--gi-text-2)",
            }}
          >
            {deltaPrefix()}{props.deltaText}
          </span>
        </div>
      </div>
    </div>
  );
}
