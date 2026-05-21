import { createMemo, For } from "solid-js";
import type { CurrentMetric } from "../lib/backend";
import {
  overallScore,
  scoreStatus,
  airQualityRecommendation,
  statusColor,
  statusLabel,
  type Status
} from "../lib/thresholds";
import { StatusPill } from "./StatusPill";

type Props = {
  metrics: CurrentMetric[];
};

// 270° arc for the overall score gauge
const CX = 80, CY = 80, R = 64;
const CIRCUMFERENCE = 2 * Math.PI * R;
const ARC_FRACTION = 0.75;
const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION;
const TRANSFORM = `rotate(135, ${CX}, ${CY})`;

export function AirQualityScore(props: Props) {
  const score = createMemo(() => overallScore(props.metrics.map(m => ({ status: m.status as Status }))));
  const status = createMemo(() => scoreStatus(score()));
  const color = createMemo(() => statusColor(status()));
  const fillLen = createMemo(() => (score() / 100) * ARC_LENGTH);
  const recommendation = createMemo(() =>
    airQualityRecommendation(props.metrics.map(m => ({ key: m.key, status: m.status as Status })))
  );

  const filterId = "aq-glow";

  return (
    <div class="aq-panel">
      <div class="aq-gauge-wrap">
        <svg viewBox="0 0 160 120" fill="none" aria-label={`Overall air quality score: ${score()}`}>
          <defs>
            <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Track */}
          <circle
            cx={CX} cy={CY} r={R}
            stroke="rgba(100,160,255,0.08)"
            stroke-width="11"
            stroke-dasharray={`${ARC_LENGTH} ${CIRCUMFERENCE - ARC_LENGTH}`}
            stroke-linecap="round"
            transform={TRANSFORM}
          />

          {/* Glow */}
          <circle
            cx={CX} cy={CY} r={R}
            stroke={color()}
            stroke-width="15"
            stroke-dasharray={`${fillLen()} ${CIRCUMFERENCE - fillLen()}`}
            stroke-linecap="round"
            transform={TRANSFORM}
            opacity="0.22"
            filter={`url(#${filterId})`}
          />

          {/* Arc */}
          <circle
            cx={CX} cy={CY} r={R}
            stroke={color()}
            stroke-width="11"
            stroke-dasharray={`${fillLen()} ${CIRCUMFERENCE - fillLen()}`}
            stroke-linecap="round"
            transform={TRANSFORM}
            style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
          />

          <text
            x={CX} y={CY - 8}
            text-anchor="middle"
            dominant-baseline="middle"
            style={{ "font-size": "2rem", "font-weight": "800", fill: "var(--text-primary)", "font-family": "inherit" }}
          >
            {score()}
          </text>
          <text
            x={CX} y={CY + 14}
            text-anchor="middle"
            style={{ "font-size": "0.65rem", fill: "var(--text-secondary)", "font-family": "inherit", "text-transform": "uppercase", "letter-spacing": "0.06em", "font-weight": "700" }}
          >
            /100
          </text>
        </svg>
        <span class="aq-score-label">AQI Score</span>
      </div>

      <div class="aq-info">
        <div>
          <StatusPill status={status()} label={statusLabel(status())} />
        </div>
        <p class="aq-recommendation">{recommendation()}</p>
        <div class="aq-metric-pills">
          <For each={props.metrics}>
            {(m) => (
              <StatusPill status={m.status as Status} label={m.label} />
            )}
          </For>
        </div>
      </div>
    </div>
  );
}
