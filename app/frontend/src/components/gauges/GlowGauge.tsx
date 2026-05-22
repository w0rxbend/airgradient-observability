import { createMemo, For } from "solid-js";

const SA         = Math.PI * 0.75;   // 135°
const EA         = Math.PI * 2.25;   // 405° — 270° sweep
const SPAN       = EA - SA;
const TICK_COUNT = 31;

function ptAt(cx: number, cy: number, r: number, t: number): [number, number] {
  const a = SA + t * SPAN;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
}

function arcPath(cx: number, cy: number, r: number, t0: number, t1: number): string {
  const [x0, y0] = ptAt(cx, cy, r, t0);
  const [x1, y1] = ptAt(cx, cy, r, t1);
  // Large-arc-flag flips when the actual angular sweep exceeds 180°.
  // Span is 270° so that threshold is at t-fraction = 180/270 = 2/3.
  const large     = (t1 - t0) * SPAN > Math.PI ? 1 : 0;
  return `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1}`;
}

export function GlowGauge(props: {
  value:  number;
  color:  string;        // solid fill color — determined by status
  max?:   number;
  min?:   number;
  gradId: string;
  thick?: number;
  size?:  number;
}) {
  const sz  = () => props.size  ?? 220;
  const tk  = () => props.thick ?? 14;
  const cx  = () => sz() / 2;
  const cy  = () => sz() / 2 + 12;
  const r   = () => sz() / 2 - tk() - 14;
  const min = () => props.min ?? 0;
  const max = () => props.max ?? 300;
  const pct = () => Math.max(0, Math.min(1, (props.value - min()) / (max() - min())));

  const ticks      = Array.from({ length: TICK_COUNT }, (_, i) => i);
  const activePath = createMemo(() =>
    pct() > 0.001 ? arcPath(cx(), cy(), r(), 0, pct()) : ""
  );
  const needlePt   = createMemo(() => ptAt(cx(), cy(), r(), pct()));

  const glowId = () => `glow-${props.gradId}`;
  const ngId   = () => `ng-${props.gradId}`;

  return (
    <svg viewBox={`0 0 ${sz()} ${sz()}`} width="100%" height="100%">
      <defs>
        {/* Glow filter for active arc */}
        <filter id={glowId()} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Needle glow filter */}
        <filter id={ngId()} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Full-arc track — faint base */}
      <path
        d={arcPath(cx(), cy(), r(), 0, 1)}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        stroke-width={tk() + 2}
        stroke-linecap="round"
      />
      {/* Full-arc track — subtle tinted hint of status color */}
      <path
        d={arcPath(cx(), cy(), r(), 0, 1)}
        fill="none"
        stroke={props.color}
        stroke-width={tk()}
        stroke-linecap="round"
        opacity="0.12"
      />

      {/* Tick marks */}
      <For each={ticks}>
        {(i) => {
          const t       = i / (TICK_COUNT - 1);
          const isMajor = i % 5 === 0;
          const outerR  = r() + tk() / 2 + 2;
          const innerR  = outerR - (isMajor ? 7 : 4);
          const angle   = SA + t * SPAN;
          const cos     = Math.cos(angle);
          const sin     = Math.sin(angle);
          return (
            <line
              x1={cx() + cos * innerR}
              y1={cy() + sin * innerR}
              x2={cx() + cos * outerR}
              y2={cy() + sin * outerR}
              stroke={isMajor ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)"}
              stroke-width={isMajor ? 1.5 : 1}
            />
          );
        }}
      </For>

      {/* Active arc — solid status color with glow */}
      {activePath() && (
        <path
          d={activePath()}
          fill="none"
          stroke={props.color}
          stroke-width={tk()}
          stroke-linecap="round"
          filter={`url(#${glowId()})`}
        />
      )}

      {/* Needle tip dot */}
      {pct() > 0.001 && (
        <>
          <circle
            cx={needlePt()[0]}
            cy={needlePt()[1]}
            r={tk() / 2 + 3}
            fill={props.color}
            filter={`url(#${ngId()})`}
          />
          <circle
            cx={needlePt()[0]}
            cy={needlePt()[1]}
            r={tk() / 2 + 3}
            fill={props.color}
          />
          <circle
            cx={needlePt()[0]}
            cy={needlePt()[1]}
            r="3"
            fill="var(--gi-bg-1)"
          />
        </>
      )}
    </svg>
  );
}
