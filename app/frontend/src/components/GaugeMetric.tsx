import { createMemo, Show } from "solid-js";
import type { JSX } from "solid-js";
import type { CurrentMetric } from "../lib/backend";
import { statusColor, statusLabel } from "../lib/thresholds";
import { StatusPill } from "./StatusPill";

type Props = { metric: CurrentMetric };

// Geometry — 270° arc, gap centered at 6 o'clock
const CX = 96, CY = 96, R = 72;
const CIRC = 2 * Math.PI * R;
const ARC = CIRC * 0.75;   // visible arc length
const ROT = `rotate(135, ${CX}, ${CY})`;

// ── Per-metric config ──────────────────────────────────────────────
type Variant = "arc" | "zoned" | "dots";

const VARIANT: Record<string, Variant> = {
  co2:         "zoned",
  pm25:        "zoned",
  temperature: "dots",
  humidity:    "arc",
  voc:         "dots",
  nox:         "arc",
};

// Accent hue shown when status is "empty" / for icon coloring
const BASE_COLOR: Record<string, string> = {
  co2:         "var(--c-info)",
  pm25:        "var(--metric-pm25)",
  temperature: "var(--metric-temperature)",
  humidity:    "var(--metric-humidity)",
  voc:         "var(--metric-voc)",
  nox:         "var(--metric-nox)",
};

// SVG icons — each renders at transform="translate(CX, CY-32)"
function IconCO2(c: string): JSX.Element {
  return (
    <text
      text-anchor="middle"
      dominant-baseline="middle"
      style={{
        fill: c,
        "font-size": "11px",
        "font-weight": "900",
        "font-family": "inherit",
        "letter-spacing": "-0.02em",
      }}
    >
      CO₂
    </text>
  );
}

function IconPM25(c: string): JSX.Element {
  return (
    <g fill={c}>
      <circle cx="-7" cy="3" r="3.5" opacity="0.65" />
      <circle cx="1"  cy="-4" r="5"  />
      <circle cx="8"  cy="3"  r="3"  opacity="0.8" />
    </g>
  );
}

function IconThermometer(c: string): JSX.Element {
  return (
    <g>
      {/* tube */}
      <rect x="-3.5" y="-14" width="7" height="16" rx="3.5" fill={c} />
      {/* bulb */}
      <circle cx="0" cy="6" r="6" fill={c} />
      {/* inner tube (dark cutout) */}
      <rect x="-1.5" y="-12" width="3" height="10" rx="1.5" fill="rgba(0,0,0,0.28)" />
    </g>
  );
}

function IconDrop(c: string): JSX.Element {
  return (
    <path
      d="M 0,-14 C -2,-8 -9,-1 -9,4 A 9,9 0 0 0 9,4 C 9,-1 2,-8 0,-14 Z"
      fill={c}
    />
  );
}

function IconCloud(c: string): JSX.Element {
  return (
    <g fill={c}>
      <circle cx="-4" cy="2" r="5.5" />
      <circle cx="4"  cy="0" r="6.5" />
      <circle cx="0"  cy="4" r="5"   />
      <rect x="-9" y="-1" width="18" height="9" />
    </g>
  );
}

function IconLightning(c: string): JSX.Element {
  return (
    <path
      d="M 4,-13 L -3,0 L 2,0 L -4,13 L 12,-4 L 5,-4 L 10,-13 Z"
      fill={c}
    />
  );
}

const ICON_FN: Record<string, (c: string) => JSX.Element> = {
  co2:         IconCO2,
  pm25:        IconPM25,
  temperature: IconThermometer,
  humidity:    IconDrop,
  voc:         IconCloud,
  nox:         IconLightning,
};

// ── Component ──────────────────────────────────────────────────────
export function GaugeMetric(props: Props) {
  const key = () => props.metric.key;
  const variant = () => VARIANT[key()] ?? "arc";
  const baseColor = () => BASE_COLOR[key()] ?? "var(--c-info)";
  const iconFn = () => ICON_FN[key()] ?? IconCO2;

  const color = createMemo(() => statusColor(props.metric.status as any));
  const filterId = `glow-${key()}`;

  // fraction of arc filled by current value
  const pct = createMemo(() => {
    const v = props.metric.value;
    if (v === null) return 0;
    return Math.max(0, Math.min(1, (v - props.metric.min) / ((props.metric.max - props.metric.min) || 1)));
  });

  const fillLen = createMemo(() => pct() * ARC);
  const gapLen  = createMemo(() => CIRC - fillLen());

  // ── Zoned variant helpers ────────────────────────────────────────
  const goodPct = createMemo(() => {
    const g = props.metric.goodBelow;
    if (g == null) return 0;
    return Math.max(0, Math.min(1, (g - props.metric.min) / ((props.metric.max - props.metric.min) || 1)));
  });
  const warnPct = createMemo(() => {
    const w = props.metric.warnBelow;
    if (w == null) return goodPct();
    return Math.max(goodPct(), Math.min(1, (w - props.metric.min) / ((props.metric.max - props.metric.min) || 1)));
  });

  const goodLen = createMemo(() => goodPct() * ARC);
  const warnLen = createMemo(() => (warnPct() - goodPct()) * ARC);
  const critLen = createMemo(() => (1 - warnPct()) * ARC);

  return (
    <article
      class={`gauge-card ${props.metric.status}`}
      aria-label={`${props.metric.label}: ${fmtVal(props.metric.value)} ${props.metric.unit}, ${statusLabel(props.metric.status as any)}`}
    >
      <header class="gauge-header">
        <span class="gauge-label">{props.metric.label}</span>
        <StatusPill status={props.metric.status as any} />
      </header>

      <div class="gauge-svg-wrap">
        <svg viewBox="0 0 192 132" fill="none" aria-hidden="true">
          <defs>
            <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* ── TRACK ──────────────────────────────────────────── */}

          {/* Arc variant: solid dim track */}
          <Show when={variant() === "arc"}>
            <circle
              cx={CX} cy={CY} r={R}
              stroke="color-mix(in srgb, var(--c-info) 10%, transparent)"
              stroke-width="12"
              stroke-dasharray={`${ARC} ${CIRC - ARC}`}
              stroke-linecap="round"
              transform={ROT}
            />
          </Show>

          {/* Zoned variant: colored zone segments as track */}
          <Show when={variant() === "zoned"}>
            <Show when={goodLen() > 0}>
              <circle
                cx={CX} cy={CY} r={R}
                stroke="var(--c-good)"
                stroke-width="12"
                stroke-dasharray={`${goodLen()} ${CIRC}`}
                stroke-dashoffset="0"
                stroke-linecap="round"
                transform={ROT}
                opacity="0.22"
              />
            </Show>
            <Show when={warnLen() > 0}>
              <circle
                cx={CX} cy={CY} r={R}
                stroke="var(--c-warning)"
                stroke-width="12"
                stroke-dasharray={`${warnLen()} ${CIRC}`}
                stroke-dashoffset={`${-goodLen()}`}
                stroke-linecap="round"
                transform={ROT}
                opacity="0.22"
              />
            </Show>
            <Show when={critLen() > 0}>
              <circle
                cx={CX} cy={CY} r={R}
                stroke="var(--c-critical)"
                stroke-width="12"
                stroke-dasharray={`${critLen()} ${CIRC}`}
                stroke-dashoffset={`${-(goodLen() + warnLen())}`}
                stroke-linecap="round"
                transform={ROT}
                opacity="0.22"
              />
            </Show>
          </Show>

          {/* Dots variant: dotted ring track */}
          <Show when={variant() === "dots"}>
            {/* outer ring of dots */}
            <circle
              cx={CX} cy={CY} r={R + 8}
              stroke="color-mix(in srgb, var(--c-info) 14%, transparent)"
              stroke-width="3"
              stroke-dasharray="2 10.4"
              stroke-linecap="round"
              transform={ROT}
            />
            {/* inner dim arc track */}
            <circle
              cx={CX} cy={CY} r={R}
              stroke="color-mix(in srgb, var(--c-info) 8%, transparent)"
              stroke-width="10"
              stroke-dasharray={`${ARC} ${CIRC - ARC}`}
              stroke-linecap="round"
              transform={ROT}
            />
          </Show>

          {/* ── VALUE ARC ──────────────────────────────────────── */}

          {/* Glow layer */}
          <Show when={pct() > 0.01}>
            <circle
              cx={CX} cy={CY} r={R}
              stroke={color()}
              stroke-width="16"
              stroke-dasharray={`${fillLen()} ${gapLen()}`}
              stroke-linecap="round"
              transform={ROT}
              opacity="0.22"
              filter={`url(#${filterId})`}
            />
          </Show>

          {/* Main arc */}
          <circle
            cx={CX} cy={CY} r={R}
            stroke={color()}
            stroke-width={variant() === "dots" ? "10" : "12"}
            stroke-dasharray={`${fillLen()} ${gapLen()}`}
            stroke-linecap="round"
            transform={ROT}
            style={{ transition: "stroke-dasharray 0.7s cubic-bezier(0.4,0,0.2,1)" }}
          />

          {/* Dots variant: accent ring dots overlaid */}
          <Show when={variant() === "dots" && pct() > 0.01}>
            <circle
              cx={CX} cy={CY} r={R + 8}
              stroke={color()}
              stroke-width="3"
              stroke-dasharray={`2 10.4`}
              stroke-linecap="round"
              transform={ROT}
              stroke-dashoffset={`${-(pct() * (ARC + 8 * 0))}`}
              opacity="0.5"
            />
          </Show>

          {/* ── ICON ──────────────────────────────────────────── */}
          <g transform={`translate(${CX}, ${CY - 30})`} opacity="0.85">
            {iconFn()(props.metric.value !== null ? color() : baseColor())}
          </g>

          {/* ── VALUE TEXT ────────────────────────────────────── */}
          <text
            x={CX}
            y={CY + 2}
            text-anchor="middle"
            dominant-baseline="middle"
            class="gauge-value-text"
            fill={props.metric.value !== null ? "var(--text-primary)" : "var(--text-muted)"}
          >
            <Show when={props.metric.value !== null} fallback="--">
              {fmtVal(props.metric.value)}
            </Show>
          </text>
          <text
            x={CX}
            y={CY + 22}
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
                minute: "2-digit",
              })
            : "—"}
        </span>
        <span>{props.metric.max}</span>
      </footer>
    </article>
  );
}

function fmtVal(v: number | null): string {
  if (v === null) return "--";
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 100)  return v.toFixed(0);
  return v.toFixed(1);
}
