import { createMemo, createSignal, For, Show } from "solid-js";
import type { RangePoint } from "../lib/backend";

type Props = {
  label: string;
  unit: string;
  points: RangePoint[];
  color?: string;
};

const W = 900;
const H = 280;
const PAD_L = 52;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 36;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const TICKS_Y = 5;
const TICKS_X = 6;

export function TimeSeriesChart(props: Props) {
  const [cursor, setCursor] = createSignal<{ x: number; idx: number } | null>(null);
  const [tooltipSide, setTooltipSide] = createSignal<"left" | "right">("right");

  const color = () => props.color ?? "var(--c-info)";
  const gradientId = () => `area-${props.label.replace(/\s/g, "")}`;

  const domain = createMemo(() => getDomain(props.points));

  const toSvgX = (ts: number) => {
    const { minX, maxX } = domain();
    return PAD_L + ((ts - minX) / ((maxX - minX) || 1)) * PLOT_W;
  };

  const toSvgY = (val: number) => {
    const { min, max } = domain();
    return PAD_T + PLOT_H - ((val - min) / ((max - min) || 1)) * PLOT_H;
  };

  const linePath = createMemo(() => {
    if (props.points.length < 2) return "";
    return props.points
      .map(([ts, val], i) => `${i === 0 ? "M" : "L"} ${toSvgX(ts).toFixed(1)} ${toSvgY(val).toFixed(1)}`)
      .join(" ");
  });

  const areaPath = createMemo(() => {
    if (props.points.length < 2) return "";
    const first = props.points[0];
    const last = props.points[props.points.length - 1];
    const base = PAD_T + PLOT_H;
    return (
      `M ${toSvgX(first[0]).toFixed(1)} ${base} ` +
      props.points.map(([ts, val]) => `L ${toSvgX(ts).toFixed(1)} ${toSvgY(val).toFixed(1)}`).join(" ") +
      ` L ${toSvgX(last[0]).toFixed(1)} ${base} Z`
    );
  });

  const yTicks = createMemo(() => {
    const { min, max } = domain();
    return Array.from({ length: TICKS_Y }, (_, i) => {
      const val = min + (i / (TICKS_Y - 1)) * (max - min);
      return { val, y: toSvgY(val) };
    });
  });

  const xTicks = createMemo(() => {
    if (props.points.length < 2) return [];
    const { minX, maxX } = domain();
    return Array.from({ length: TICKS_X }, (_, i) => {
      const ts = minX + (i / (TICKS_X - 1)) * (maxX - minX);
      return { ts, x: toSvgX(ts) };
    });
  });

  const hoverPoint = createMemo(() => {
    const c = cursor();
    if (!c || props.points.length === 0) return null;
    const pt = props.points[c.idx];
    if (!pt) return null;
    return { x: toSvgX(pt[0]), y: toSvgY(pt[1]), val: pt[1], ts: pt[0] };
  });

  function handleMouseMove(e: MouseEvent) {
    const svg = (e.currentTarget as SVGElement).closest(".chart-svg-wrap");
    if (!svg || props.points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const svgX = (relX / rect.width) * W;
    const { minX, maxX } = domain();
    const ts = minX + ((svgX - PAD_L) / PLOT_W) * (maxX - minX);
    let closest = 0;
    let minDiff = Infinity;
    props.points.forEach(([t], i) => {
      const d = Math.abs(t - ts);
      if (d < minDiff) { minDiff = d; closest = i; }
    });
    const pxX = toSvgX(props.points[closest][0]);
    setTooltipSide(pxX > W / 2 ? "left" : "right");
    setCursor({ x: pxX, idx: closest });
  }

  return (
    <div class="chart-panel glass-card">
      <div class="chart-heading">
        <div>
          <p class="chart-title">History</p>
          <span class="chart-metric">{props.label}</span>
        </div>
        <span class="chart-unit">{props.unit}</span>
      </div>

      <Show
        when={props.points.length > 1}
        fallback={
          <div class="empty-state">
            <div class="empty-state-icon">📊</div>
            <div>No historical data yet</div>
          </div>
        }
      >
        <div
          class="chart-svg-wrap"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setCursor(null)}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            role="img"
            aria-label={`${props.label} time series chart`}
          >
            <defs>
              <linearGradient id={gradientId()} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color={color()} stop-opacity="0.25" />
                <stop offset="85%" stop-color={color()} stop-opacity="0.02" />
              </linearGradient>
              <clipPath id={`clip-${gradientId()}`}>
                <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} />
              </clipPath>
            </defs>

            {/* Y grid + labels */}
            <For each={yTicks()}>
              {({ val, y }) => (
                <>
                  <line
                    x1={PAD_L} x2={PAD_L + PLOT_W}
                    y1={y} y2={y}
                    class="grid-line"
                  />
                  <text x={PAD_L - 6} y={y} text-anchor="end" dominant-baseline="middle" class="axis-label">
                    {formatTick(val)}
                  </text>
                </>
              )}
            </For>

            {/* X labels */}
            <For each={xTicks()}>
              {({ ts, x }) => (
                <text x={x} y={H - 6} text-anchor="middle" class="axis-label">
                  {formatTime(ts)}
                </text>
              )}
            </For>

            {/* Area fill */}
            <path
              d={areaPath()}
              fill={`url(#${gradientId()})`}
              class="series-area"
              clip-path={`url(#clip-${gradientId()})`}
            />

            {/* Line */}
            <path
              d={linePath()}
              class="series-line"
              stroke={color()}
              clip-path={`url(#clip-${gradientId()})`}
            />

            {/* Crosshair */}
            <Show when={cursor() && hoverPoint()}>
              <line
                x1={hoverPoint()!.x} x2={hoverPoint()!.x}
                y1={PAD_T} y2={PAD_T + PLOT_H}
                class="crosshair-line"
              />
              <circle
                cx={hoverPoint()!.x}
                cy={hoverPoint()!.y}
                r="5"
                fill={color()}
                class="crosshair-dot"
              />
              <circle
                cx={hoverPoint()!.x}
                cy={hoverPoint()!.y}
                r="9"
                fill={color()}
                opacity="0.2"
                class="crosshair-dot"
              />
            </Show>
          </svg>

          {/* Tooltip */}
          <Show when={cursor() && hoverPoint()}>
            <div
              class="chart-tooltip"
              style={{
                left: tooltipSide() === "right"
                  ? `${((hoverPoint()!.x + 14) / W * 100).toFixed(1)}%`
                  : "auto",
                right: tooltipSide() === "left"
                  ? `${((1 - (hoverPoint()!.x - 14) / W) * 100).toFixed(1)}%`
                  : "auto",
                top: "20px",
                transform: "none"
              }}
            >
              <div class="chart-tooltip-value">
                {formatValue(hoverPoint()!.val)} {props.unit}
              </div>
              <div class="chart-tooltip-time">
                {formatTimeFull(hoverPoint()!.ts)}
              </div>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}

function getDomain(points: RangePoint[]) {
  if (points.length === 0) return { minX: 0, maxX: 1, min: 0, max: 1 };
  const xs = points.map(([ts]) => ts);
  const ys = points.map(([, v]) => v);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const pad = (max - min || 1) * 0.1;
  return { minX: Math.min(...xs), maxX: Math.max(...xs), min: min - pad, max: max + pad };
}

function formatTick(val: number): string {
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}k`;
  if (Math.abs(val) >= 100) return val.toFixed(0);
  return val.toFixed(1);
}

function formatValue(val: number): string {
  if (Math.abs(val) >= 1000) return val.toFixed(0);
  if (Math.abs(val) >= 100) return val.toFixed(0);
  return val.toFixed(1);
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() !== now.toDateString()) {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTimeFull(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}
