import { createMemo } from "solid-js";

let _sparkId = 0;

export function GaugeSpark(props: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const W   = 200;
  const h   = () => props.height ?? 32;
  const c   = () => props.color ?? "#2BD46B";
  const gid = `gsp-${++_sparkId}`;

  const paths = createMemo(() => {
    const d = props.data;
    if (!d || d.length < 2) return { line: "", fill: "", last: null as [number, number] | null };
    const min   = Math.min(...d);
    const max   = Math.max(...d);
    const range = Math.max(0.001, max - min);
    const ht    = h();
    const pts   = d.map((v, i) => [
      (i / (d.length - 1)) * W,
      ht - ((v - min) / range) * (ht - 6) - 3,
    ] as [number, number]);
    const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
    const fill = `${line} L${W},${ht} L0,${ht} Z`;
    return { line, fill, last: pts[pts.length - 1] };
  });

  return (
    <svg
      width="100%"
      height={h()}
      viewBox={`0 0 ${W} ${h()}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stop-color={c()} stop-opacity="0.25" />
          <stop offset="100%" stop-color={c()} stop-opacity="0"    />
        </linearGradient>
      </defs>
      {paths().fill && (
        <path d={paths().fill} fill={`url(#${gid})`} />
      )}
      {paths().line && (
        <path
          d={paths().line}
          fill="none"
          stroke={c()}
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      )}
      {paths().last && (
        <circle
          cx={paths().last![0]}
          cy={paths().last![1]}
          r="2.5"
          fill={c()}
          style={{ filter: `drop-shadow(0 0 6px ${c()})` }}
        />
      )}
    </svg>
  );
}
