import { createMemo, createSignal, For, Show } from "solid-js";
import type { RangePoint } from "../api/backendClient";
import {
  buildHistogramBins,
  chartGeometry,
  formatChartTime,
  formatChartTimestamp,
  formatChartValue,
  formatTick,
  getDomain,
} from "./chart/timeSeriesChartModel";

export type ChartType = "line" | "bar" | "histogram";

type Props = {
  label: string;
  unit: string;
  points: RangePoint[];
  color?: string;
  initialType?: ChartType;
};

const W = chartGeometry.width;
const H = chartGeometry.height;
const PAD_L = chartGeometry.padLeft;
const PAD_R = chartGeometry.padRight;
const PAD_T = chartGeometry.padTop;
const PAD_B = chartGeometry.padBottom;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const TICKS_Y = chartGeometry.yTicks;
const TICKS_X = chartGeometry.xTicks;
const N_BINS = chartGeometry.histogramBins;

export function TimeSeriesChart(props: Props) {
  const [chartType, setChartType] = createSignal<ChartType>(props.initialType ?? "line");
  const [cursor, setCursor] = createSignal<{ x: number; idx: number } | null>(null);
  const [histCursor, setHistCursor] = createSignal<number | null>(null);
  const [tooltipSide, setTooltipSide] = createSignal<"left" | "right">("right");

  const color = () => props.color ?? "var(--c-info)";
  const gradId = () => `g-${props.label.replace(/\W/g, "")}`;

  // ── Time-series domain ─────────────────────────────────────────────
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
      .map(([ts, v], i) => `${i === 0 ? "M" : "L"} ${toSvgX(ts).toFixed(1)} ${toSvgY(v).toFixed(1)}`)
      .join(" ");
  });

  const areaPath = createMemo(() => {
    if (props.points.length < 2) return "";
    const base = PAD_T + PLOT_H;
    const first = props.points[0];
    const last = props.points[props.points.length - 1];
    return (
      `M ${toSvgX(first[0]).toFixed(1)} ${base} ` +
      props.points.map(([ts, v]) => `L ${toSvgX(ts).toFixed(1)} ${toSvgY(v).toFixed(1)}`).join(" ") +
      ` L ${toSvgX(last[0]).toFixed(1)} ${base} Z`
    );
  });

  const barW = createMemo(() =>
    Math.max(1.5, Math.min(20, PLOT_W / Math.max(props.points.length, 1) - 1))
  );

  const baseY = createMemo(() => {
    const { min } = domain();
    return toSvgY(Math.max(min, 0));
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

  const hoverPt = createMemo(() => {
    const c = cursor();
    if (!c) return null;
    const pt = props.points[c.idx];
    if (!pt) return null;
    return { x: toSvgX(pt[0]), y: toSvgY(pt[1]), val: pt[1], ts: pt[0] };
  });

  // ── Histogram domain ───────────────────────────────────────────────
  const histBins = createMemo(() => buildHistogramBins(props.points, N_BINS));

  const histDom = createMemo(() => {
    const bins = histBins();
    if (bins.length === 0) return { minX: 0, maxX: 1, maxY: 1 };
    return {
      minX: bins[0].lo,
      maxX: bins[N_BINS - 1].hi,
      maxY: Math.max(...bins.map((b) => b.count)) * 1.15,
    };
  });

  const toHistX = (val: number) => {
    const { minX, maxX } = histDom();
    return PAD_L + ((val - minX) / ((maxX - minX) || 1)) * PLOT_W;
  };
  const toHistY = (count: number) =>
    PAD_T + PLOT_H - (count / (histDom().maxY || 1)) * PLOT_H;

  const histYTicks = createMemo(() => {
    const { maxY } = histDom();
    return Array.from({ length: TICKS_Y }, (_, i) => {
      const count = (i / (TICKS_Y - 1)) * maxY;
      return { label: Math.round(count), y: toHistY(count) };
    });
  });

  const histXTicks = createMemo(() => {
    const { minX, maxX } = histDom();
    return Array.from({ length: TICKS_X }, (_, i) => {
      const val = minX + (i / (TICKS_X - 1)) * (maxX - minX);
      return { val, x: toHistX(val) };
    });
  });

  const hoveredBin = createMemo(() => {
    const bi = histCursor();
    if (bi === null) return null;
    const bin = histBins()[bi];
    if (!bin) return null;
    const midX = toHistX(bin.lo + (bin.hi - bin.lo) / 2);
    return { ...bin, midX };
  });

  // ── Interactions ───────────────────────────────────────────────────
  function handleMouseMove(e: MouseEvent) {
    const wrap = (e.currentTarget as Element).closest(".chart-svg-wrap");
    if (!wrap || props.points.length === 0) return;
    const rect = wrap.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;

    if (chartType() === "histogram") {
      const { minX, maxX } = histDom();
      const val = minX + ((svgX - PAD_L) / PLOT_W) * (maxX - minX);
      const bw = (maxX - minX) / N_BINS;
      setHistCursor(Math.max(0, Math.min(N_BINS - 1, Math.floor((val - minX) / bw))));
      return;
    }

    const { minX, maxX } = domain();
    const ts = minX + ((svgX - PAD_L) / PLOT_W) * (maxX - minX);
    let closest = 0, minDiff = Infinity;
    props.points.forEach(([t], i) => {
      const d = Math.abs(t - ts);
      if (d < minDiff) { minDiff = d; closest = i; }
    });
    const pxX = toSvgX(props.points[closest][0]);
    setTooltipSide(pxX > W / 2 ? "left" : "right");
    setCursor({ x: pxX, idx: closest });
  }

  function handleMouseLeave() {
    setCursor(null);
    setHistCursor(null);
  }

  const clip = () => `url(#clip-${gradId()})`;

  return (
    <div class="chart-panel glass-card">
      <div class="chart-heading">
        <div>
          <p class="chart-title">History</p>
          <span class="chart-metric">{props.label}</span>
        </div>
        <div class="chart-type-switcher segmented" role="group" aria-label="Chart type">
          <button
            class={chartType() === "line" ? "active" : ""}
            onClick={() => setChartType("line")}
            aria-pressed={chartType() === "line"}
          >
            Line
          </button>
          <button
            class={chartType() === "bar" ? "active" : ""}
            onClick={() => setChartType("bar")}
            aria-pressed={chartType() === "bar"}
          >
            Bar
          </button>
          <button
            class={chartType() === "histogram" ? "active" : ""}
            onClick={() => setChartType("histogram")}
            aria-pressed={chartType() === "histogram"}
          >
            Hist
          </button>
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
          onMouseLeave={handleMouseLeave}
        >
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${props.label} ${chartType()} chart`}>
            <defs>
              <linearGradient id={gradId()} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color={color()} stop-opacity="0.25" />
                <stop offset="85%" stop-color={color()} stop-opacity="0.02" />
              </linearGradient>
              <clipPath id={`clip-${gradId()}`}>
                <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} />
              </clipPath>
            </defs>

            {/* ── Axes — time-series (line + bar) ─────────────────── */}
            <Show when={chartType() !== "histogram"}>
              <For each={yTicks()}>
                {({ val, y }) => (
                  <>
                    <line x1={PAD_L} x2={PAD_L + PLOT_W} y1={y} y2={y} class="grid-line" />
                    <text x={PAD_L - 6} y={y} text-anchor="end" dominant-baseline="middle" class="axis-label">
                      {formatTick(val)}
                    </text>
                  </>
                )}
              </For>
              <For each={xTicks()}>
                {({ ts, x }) => (
                  <text x={x} y={H - 6} text-anchor="middle" class="axis-label">
                    {formatChartTime(ts)}
                  </text>
                )}
              </For>
            </Show>

            {/* ── Axes — histogram ────────────────────────────────── */}
            <Show when={chartType() === "histogram"}>
              <For each={histYTicks()}>
                {({ label, y }) => (
                  <>
                    <line x1={PAD_L} x2={PAD_L + PLOT_W} y1={y} y2={y} class="grid-line" />
                    <text x={PAD_L - 6} y={y} text-anchor="end" dominant-baseline="middle" class="axis-label">
                      {label}
                    </text>
                  </>
                )}
              </For>
              <For each={histXTicks()}>
                {({ val, x }) => (
                  <text x={x} y={H - 6} text-anchor="middle" class="axis-label">
                    {formatTick(val)}
                  </text>
                )}
              </For>
              <text
                x={PAD_L + PLOT_W / 2}
                y={H - 6}
                text-anchor="middle"
                class="axis-label"
                style={{ fill: "var(--text-muted)", "font-style": "italic" }}
              />
            </Show>

            {/* ── Line + area ─────────────────────────────────────── */}
            <Show when={chartType() === "line"}>
              <path d={areaPath()} fill={`url(#${gradId()})`} class="series-area" clip-path={clip()} />
              <path d={linePath()} class="series-line" stroke={color()} clip-path={clip()} />
            </Show>

            {/* ── Bar (time-series) ────────────────────────────────── */}
            <Show when={chartType() === "bar"}>
              <g clip-path={clip()}>
                <For each={props.points}>
                  {([ts, val], i) => {
                    const x = toSvgX(ts);
                    const y = toSvgY(val);
                    const bh = Math.abs(baseY() - y);
                    return (
                      <rect
                        x={x - barW() / 2}
                        y={Math.min(y, baseY())}
                        width={barW()}
                        height={Math.max(bh, 1)}
                        fill={color()}
                        opacity={cursor()?.idx === i() ? 0.95 : 0.55}
                        rx="1"
                      />
                    );
                  }}
                </For>
              </g>
            </Show>

            {/* ── Histogram bars ───────────────────────────────────── */}
            <Show when={chartType() === "histogram"}>
              <g clip-path={clip()}>
                <For each={histBins()}>
                  {(bin, i) => {
                    const x = toHistX(bin.lo);
                    const bw = Math.max(toHistX(bin.hi) - x - 1, 1);
                    const y = toHistY(bin.count);
                    const bh = PAD_T + PLOT_H - y;
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={bw}
                        height={Math.max(bh, 0)}
                        fill={color()}
                        opacity={histCursor() === i() ? 1 : 0.65}
                        rx="2"
                      />
                    );
                  }}
                </For>
              </g>
            </Show>

            {/* ── Crosshair (line + bar) ───────────────────────────── */}
            <Show when={chartType() !== "histogram" && cursor() && hoverPt()}>
              <line
                x1={hoverPt()!.x} x2={hoverPt()!.x}
                y1={PAD_T} y2={PAD_T + PLOT_H}
                class="crosshair-line"
              />
              <Show when={chartType() === "line"}>
                <circle cx={hoverPt()!.x} cy={hoverPt()!.y} r="5" fill={color()} class="crosshair-dot" />
                <circle cx={hoverPt()!.x} cy={hoverPt()!.y} r="9" fill={color()} opacity="0.2" class="crosshair-dot" />
              </Show>
            </Show>
          </svg>

          {/* ── Tooltip — line + bar ────────────────────────────── */}
          <Show when={chartType() !== "histogram" && cursor() && hoverPt()}>
            <div
              class="chart-tooltip"
              style={{
                left: tooltipSide() === "right" ? `${((hoverPt()!.x + 14) / W * 100).toFixed(1)}%` : "auto",
                right: tooltipSide() === "left" ? `${((1 - (hoverPt()!.x - 14) / W) * 100).toFixed(1)}%` : "auto",
                top: "20px",
                transform: "none",
              }}
            >
              <div class="chart-tooltip-value">{formatChartValue(hoverPt()!.val)} {props.unit}</div>
              <div class="chart-tooltip-time">{formatChartTimestamp(hoverPt()!.ts)}</div>
            </div>
          </Show>

          {/* ── Tooltip — histogram ─────────────────────────────── */}
          <Show when={chartType() === "histogram" && hoveredBin()}>
            {(() => {
              const bin = hoveredBin()!;
              const isRight = bin.midX < W / 2;
              return (
                <div
                  class="chart-tooltip"
                  style={{
                    left: isRight ? `${(bin.midX / W * 100).toFixed(1)}%` : "auto",
                    right: isRight ? "auto" : `${((1 - bin.midX / W) * 100).toFixed(1)}%`,
                    top: "20px",
                    transform: "none",
                  }}
                >
                  <div class="chart-tooltip-value">{bin.count} readings</div>
                  <div class="chart-tooltip-time">
                    {formatTick(bin.lo)} – {formatTick(bin.hi)} {props.unit}
                  </div>
                </div>
              );
            })()}
          </Show>
        </div>
      </Show>
    </div>
  );
}
