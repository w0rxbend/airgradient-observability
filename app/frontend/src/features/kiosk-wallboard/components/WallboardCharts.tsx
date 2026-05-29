// Shared SVG chart primitives for Wallboard kiosk components.
import { createMemo, For } from "solid-js";
import { clamp01 } from "../../../shared/domain/airQuality";

// ─── Sparkline ────────────────────────────────────────────────────────────

export function Sparkline(props: {
  data: number[];
  color?: string;
  height?: number;
  stroke?: number;
}) {
  const W  = 300;
  const h  = () => props.height ?? 40;
  const c  = () => props.color  ?? "var(--ks-signal)";
  const sw = () => props.stroke ?? 2;
  const gid = `ksg-${Math.random().toString(36).slice(2, 7)}`;

  const paths = createMemo(() => {
    const d = props.data;
    if (!d?.length) return { line: "", fill: "" };
    const min   = Math.min(...d);
    const max   = Math.max(...d);
    const range = Math.max(0.001, max - min);
    const ht    = h();
    const pts   = d.map((v, i) => [
      (i / (d.length - 1)) * W,
      ht - ((v - min) / range) * (ht - 4) - 2,
    ]);
    const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
    const fill = `${line} L${W},${ht} L0,${ht} Z`;
    return { line, fill };
  });

  return (
    <svg width="100%" height={h()} viewBox={`0 0 ${W} ${h()}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stop-color={c()} stop-opacity="0.3" />
          <stop offset="100%" stop-color={c()} stop-opacity="0"   />
        </linearGradient>
      </defs>
      <path d={paths().fill} fill={`url(#${gid})`} />
      <path d={paths().line} fill="none" stroke={c()} stroke-width={sw()} stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  );
}

// ─── ArcGauge ─────────────────────────────────────────────────────────────

const ARC_SEGS = [
  { from: 0,        to: 50 / 300,  color: "var(--ks-aqi-1)" },
  { from: 50 / 300, to: 100 / 300, color: "var(--ks-aqi-2)" },
  { from: 100/ 300, to: 150 / 300, color: "var(--ks-aqi-3)" },
  { from: 150/ 300, to: 200 / 300, color: "var(--ks-aqi-4)" },
  { from: 200/ 300, to: 250 / 300, color: "var(--ks-aqi-5)" },
  { from: 250/ 300, to: 1,         color: "var(--ks-aqi-6)" },
];

const SA   = Math.PI * 0.85;
const EA   = Math.PI * 0.15 + Math.PI * 2;
const SPAN = EA - SA;

export function ArcGauge(props: {
  value: number;
  max?:  number;
  size?: number;
  thick?: number;
}) {
  const max  = () => props.max   ?? 300;
  const size = () => props.size  ?? 280;
  const tk   = () => props.thick ?? 22;
  const cx   = () => size() / 2;
  const cy   = () => size() / 2 + 20;
  const r    = () => size() / 2 - tk() / 2 - 4;
  const pct  = () => clamp01(props.value / max());

  const ptAt = (t: number) => {
    const a = SA + t * SPAN;
    return [cx() + Math.cos(a) * r(), cy() + Math.sin(a) * r()];
  };

  const arcD = (t0: number, t1: number) => {
    const [x0, y0] = ptAt(t0);
    const [x1, y1] = ptAt(t1);
    const large = t1 - t0 > 0.5 ? 1 : 0;
    return `M${x0},${y0} A${r()},${r()} 0 ${large} 1 ${x1},${y1}`;
  };

  const needleAngle = () => (SA + pct() * SPAN) * (180 / Math.PI);

  return (
    <svg viewBox={`0 0 ${size()} ${size()}`} width="100%" height="100%">
      {/* track shadow */}
      <path d={arcD(0, 1)} stroke="rgba(255,255,255,0.06)" stroke-width={tk() + 6} fill="none" stroke-linecap="butt" />
      {/* coloured AQI segments */}
      <For each={ARC_SEGS}>
        {(seg) => (
          <path d={arcD(seg.from, seg.to)} stroke={seg.color} stroke-width={tk()} fill="none" stroke-linecap="butt" />
        )}
      </For>
      {/* needle */}
      <g transform={`translate(${cx()} ${cy()})`}>
        <circle r="7" fill="var(--ks-ink-1)" stroke="var(--ks-paper-0)" stroke-width="2" />
        <g transform={`rotate(${needleAngle()})`}>
          <rect x={-2} y={-1.5} width={r() - 10} height={3} rx={1.5} fill="var(--ks-paper-0)" />
        </g>
        <circle r="3.5" fill="var(--ks-paper-0)" />
      </g>
    </svg>
  );
}

// ─── MiniRadial ───────────────────────────────────────────────────────────

export function MiniRadial(props: {
  value: number;
  max?:  number;
  color?: string;
  size?:  number;
  thick?: number;
}) {
  const max   = () => props.max   ?? 2000;
  const color = () => props.color ?? "var(--ks-signal)";
  const size  = () => props.size  ?? 120;
  const tk    = () => props.thick ?? 12;
  const cx    = () => size() / 2;
  const cy    = () => size() / 2;
  const r     = () => size() / 2 - tk() / 2 - 2;
  const circ  = () => 2 * Math.PI * r();
  const offset = () => circ() * (1 - clamp01(props.value / max()));

  return (
    <svg viewBox={`0 0 ${size()} ${size()}`} width={size()} height={size()} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx()} cy={cy()} r={r()} fill="none" stroke="rgba(255,255,255,0.08)" stroke-width={tk()} />
      <circle
        cx={cx()} cy={cy()} r={r()}
        fill="none"
        stroke={color()}
        stroke-width={tk()}
        stroke-dasharray={String(circ())}
        stroke-dashoffset={String(offset())}
        stroke-linecap="round"
        style={{ transition: "stroke-dashoffset 0.9s ease" }}
      />
    </svg>
  );
}

// ─── MultiLine ────────────────────────────────────────────────────────────

export function MultiLine(props: {
  series: Array<{ name: string; data: number[]; color: string }>;
  height?: number;
}) {
  const W  = 800;
  const H  = () => props.height ?? 200;
  const PL = 36, PR = 12, PT = 14, PB = 22;
  const iW = W - PL - PR;
  const iH = () => H() - PT - PB;

  const allMax = () => Math.max(...props.series.flatMap(s => s.data), 1);
  const yMax   = () => Math.ceil(allMax() / 50) * 50;
  const xAt    = (i: number, n: number) => PL + (i / Math.max(1, n - 1)) * iW;
  const yAt    = (v: number) => PT + iH() - (v / yMax()) * iH();

  return (
    <svg viewBox={`0 0 ${W} ${H()}`} width="100%" height={H()} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <For each={props.series}>
          {(s, i) => (
            <linearGradient id={`ksml-${i()}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stop-color={s.color} stop-opacity="0.2" />
              <stop offset="100%" stop-color={s.color} stop-opacity="0"   />
            </linearGradient>
          )}
        </For>
      </defs>

      {/* y grid */}
      <For each={[0, 1, 2, 3, 4]}>
        {(i) => {
          const v = (yMax() / 4) * i;
          const y = yAt(v);
          return (
            <g>
              <line x1={PL} x2={W - PR} y1={y} y2={y} stroke="rgba(255,255,255,0.05)" stroke-dasharray="2 4" />
              <text x={PL - 5} y={y + 3} text-anchor="end" font-family="JetBrains Mono" font-size="9" fill="var(--ks-muted)">
                {Math.round(v)}
              </text>
            </g>
          );
        }}
      </For>

      {/* hour axis */}
      <For each={[0, 4, 8, 12, 16, 20, 24]}>
        {(h) => (
          <text x={PL + (h / 24) * iW} y={H() - 5} text-anchor="middle" font-family="JetBrains Mono" font-size="9" fill="var(--ks-muted)">
            {String(h).padStart(2, "0")}:00
          </text>
        )}
      </For>

      {/* series */}
      <For each={props.series}>
        {(s, i) => {
          const pts   = () => s.data.map((v, j) => [xAt(j, s.data.length), yAt(v)] as const);
          const lineD = () => pts().map((p, k) => k === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`).join(" ");
          const fillD = () => {
            const p = pts();
            if (!p.length) return "";
            return `${lineD()} L${p[p.length - 1][0]},${PT + iH()} L${p[0][0]},${PT + iH()} Z`;
          };
          return (
            <g>
              <path d={fillD()} fill={`url(#ksml-${i()})`} />
              <path d={lineD()} fill="none" stroke={s.color} stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />
            </g>
          );
        }}
      </For>

      {/* "now" marker */}
      <line x1={PL + iW} x2={PL + iW} y1={PT} y2={PT + iH()} stroke="var(--ks-signal)" stroke-opacity="0.35" stroke-dasharray="3 3" />
    </svg>
  );
}
