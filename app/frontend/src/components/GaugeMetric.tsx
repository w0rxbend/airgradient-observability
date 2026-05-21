import { createMemo, Show } from "solid-js";
import type { CurrentMetric } from "../lib/backend";
import { statusColor, statusLabel } from "../lib/thresholds";
import { StatusPill } from "./StatusPill";

type Props = {
  metric: CurrentMetric;
};

// 270° arc, gap at bottom. Radius 72, center (96, 96).
const CX = 96;
const CY = 96;
const R = 72;
const CIRCUMFERENCE = 2 * Math.PI * R;
const ARC_FRACTION = 0.75;
const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION;
// Rotate so the arc starts at 7:30 (gap centered at 6 o'clock)
const TRANSFORM = `rotate(135, ${CX}, ${CY})`;

export function GaugeMetric(props: Props) {
  const pct = createMemo(() => {
    const v = props.metric.value;
    if (v === null) return 0;
    const span = (props.metric.max - props.metric.min) || 1;
    return Math.max(0, Math.min(1, (v - props.metric.min) / span));
  });

  const color = createMemo(() => statusColor(props.metric.status as any));
  const fillLen = createMemo(() => pct() * ARC_LENGTH);
  const gapLen = createMemo(() => CIRCUMFERENCE - fillLen());
  const filterId = `glow-${props.metric.key}`;

  return (
    <article
      class={`gauge-card ${props.metric.status}`}
      aria-label={`${props.metric.label}: ${formatValue(props.metric.value)} ${props.metric.unit}, status ${statusLabel(props.metric.status as any)}`}
    >
      <header class="gauge-header">
        <span class="gauge-label">{props.metric.label}</span>
        <StatusPill status={props.metric.status as any} />
      </header>

      <div class="gauge-svg-wrap">
        <svg viewBox={`0 0 192 130`} fill="none" aria-hidden="true">
          <defs>
            <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background track */}
          <circle
            cx={CX} cy={CY} r={R}
            stroke="rgba(100,160,255,0.08)"
            stroke-width="12"
            stroke-dasharray={`${ARC_LENGTH} ${CIRCUMFERENCE - ARC_LENGTH}`}
            stroke-linecap="round"
            transform={TRANSFORM}
          />

          {/* Glow layer (wider, blurred) */}
          <Show when={pct() > 0}>
            <circle
              cx={CX} cy={CY} r={R}
              stroke={color()}
              stroke-width="16"
              stroke-dasharray={`${fillLen()} ${gapLen()}`}
              stroke-linecap="round"
              transform={TRANSFORM}
              opacity="0.25"
              filter={`url(#${filterId})`}
            />
          </Show>

          {/* Value arc */}
          <circle
            cx={CX} cy={CY} r={R}
            stroke={color()}
            stroke-width="12"
            stroke-dasharray={`${fillLen()} ${gapLen()}`}
            stroke-linecap="round"
            transform={TRANSFORM}
            style={{
              transition: "stroke-dasharray 0.7s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          />

          {/* Value */}
          <text
            x={CX} y={CY - 6}
            text-anchor="middle"
            dominant-baseline="middle"
            class="gauge-value-text"
            fill={props.metric.value !== null ? "var(--text-primary)" : "var(--text-muted)"}
          >
            <Show when={props.metric.value !== null} fallback="--">
              {formatValue(props.metric.value)}
            </Show>
          </text>
          <text
            x={CX} y={CY + 16}
            text-anchor="middle"
            class="gauge-unit-text"
            fill="var(--text-secondary)"
          >
            {props.metric.unit}
          </text>
        </svg>
      </div>

      <footer class="gauge-footer">
        <span>{props.metric.min}</span>
        <span class="gauge-ts">
          {props.metric.timestamp
            ? new Date(props.metric.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
              })
            : "—"}
        </span>
        <span>{props.metric.max}</span>
      </footer>
    </article>
  );
}

function formatValue(value: number | null): string {
  if (value === null) return "--";
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(1);
}
