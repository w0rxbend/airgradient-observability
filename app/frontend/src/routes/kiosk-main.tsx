import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  Match,
  onCleanup,
  Show,
  Switch,
} from "solid-js";
import type { JSX } from "solid-js";
import type { CurrentMetric, CurrentResponse } from "../lib/backend";
import { fetchCurrent } from "../lib/backend";
import { overallScore, scoreStatus, type Status } from "../lib/thresholds";

const REFRESH_MS = 5_000;
const METRIC_ORDER = ["co2", "pm25", "voc", "nox", "temperature", "humidity"];
const PRIMARY_ORDER = ["temperature", "humidity", "co2"];

const METRIC_ACCENT: Record<string, string> = {
  co2: "var(--c-info)",
  pm25: "var(--metric-pm25)",
  voc: "var(--metric-voc)",
  nox: "var(--metric-nox)",
  temperature: "var(--metric-temperature)",
  humidity: "var(--metric-humidity)",
};

export default function KioskMain() {
  const [tick, setTick] = createSignal(0);
  const [latest, setLatest] = createSignal<CurrentResponse>();

  const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
  onCleanup(() => clearInterval(timer));

  const [current] = createResource(tick, () => fetchCurrent());

  createEffect(() => {
    const next = current();
    if (next) setLatest(next);
  });

  const displayed = createMemo(() => latest());
  const degraded = createMemo(() => Boolean(current.error && displayed()));
  const metrics = createMemo(() => sortMetrics(displayed()?.metrics ?? []));
  const score = createMemo(() =>
    overallScore(metrics().map((metric) => ({ status: metric.status as Status })))
  );
  const status = createMemo(() => scoreStatus(score()));
  const primaryMetrics = createMemo(() =>
    PRIMARY_ORDER
      .map((key) => metrics().find((metric) => metric.key === key))
      .filter(Boolean) as CurrentMetric[]
  );

  const lastSeen = createMemo(() => {
    const ts = displayed()?.timestamp;
    if (!ts) return "--:--";
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  });

  return (
    <main class="km2-shell" aria-label="AirGradient kiosk overview">
      <div class="km2-ambient orb-a" />
      <div class="km2-ambient orb-b" />
      <div class="km2-ambient veil" />

      <header class="km2-header">
        <div>
          <p>AirGradient Live</p>
          <h1>Indoor Air</h1>
        </div>
        <div class={`km2-sync ${degraded() ? "stale" : ""}`}>
          <span />
          <strong>{lastSeen()}</strong>
          <Show when={degraded()}>
            <em>stale</em>
          </Show>
        </div>
      </header>

      <Switch>
        <Match when={current.loading && !displayed()}>
          <section class="km2-loading" aria-busy="true">
            <For each={Array.from({ length: 8 })}>
              {() => <div />}
            </For>
          </section>
        </Match>
        <Match when={current.error && !displayed()}>
          <div class="error-box">Cannot reach backend.</div>
        </Match>
        <Match when={displayed()}>
          <section class="km2-board">
            <QualityHero score={score()} status={status()} />
            <PrimaryCluster metrics={primaryMetrics()} />
            <MetricMatrix metrics={metrics()} />
          </section>
        </Match>
      </Switch>
    </main>
  );
}

function QualityHero(props: { score: number; status: Status }) {
  return (
    <article
      class={`km2-card km2-hero ${props.status}`}
      style={{ "--score": props.score } as JSX.CSSProperties}
    >
      <div class="km2-hero-copy">
        <p>Air score</p>
        <strong>{props.score}</strong>
        <span>{statusText(props.status)}</span>
      </div>
      <div class="km2-hero-meter" aria-hidden="true">
        <span style={{ width: `${props.score}%` }} />
      </div>
      <div class="km2-score-band" aria-hidden="true">
        <For each={Array.from({ length: 24 })}>
          {(_, index) => (
            <i
              style={{
                "--delay": `${index() * 45}ms`,
                opacity: index() < Math.round((props.score / 100) * 24) ? 1 : 0.18,
              } as JSX.CSSProperties}
            />
          )}
        </For>
      </div>
    </article>
  );
}

function PrimaryCluster(props: { metrics: CurrentMetric[] }) {
  return (
    <article class="km2-card km2-primary-card">
      <header>
        <span>Now</span>
        <strong>Core readings</strong>
      </header>
      <div class="km2-primary-list">
        <For each={props.metrics}>
          {(metric) => <PrimaryReadout metric={metric} />}
        </For>
      </div>
    </article>
  );
}

function PrimaryReadout(props: { metric: CurrentMetric }) {
  return (
    <div
      class="km2-primary"
      style={{ "--accent": accent(props.metric), "--pct": pct(props.metric) } as JSX.CSSProperties}
    >
      <MetricGlyph metric={props.metric} compact />
      <div>
        <span>{shortLabel(props.metric)}</span>
        <strong>
          {formatValue(props.metric.value)}
          <small>{props.metric.unit}</small>
        </strong>
      </div>
      <i />
    </div>
  );
}

function MetricMatrix(props: { metrics: CurrentMetric[] }) {
  return (
    <section class="km2-metrics" aria-label="Current sensor readings">
      <For each={props.metrics}>
        {(metric) => <MetricTile metric={metric} />}
      </For>
    </section>
  );
}

function MetricTile(props: { metric: CurrentMetric }) {
  const valuePct = () => pct(props.metric);
  return (
    <article
      class={`km2-card km2-tile ${props.metric.status}`}
      style={{ "--accent": accent(props.metric), "--pct": valuePct() } as JSX.CSSProperties}
    >
      <header>
        <MetricGlyph metric={props.metric} />
        <span>{props.metric.label}</span>
      </header>
      <div class="km2-value">
        {formatValue(props.metric.value)}
        <small>{props.metric.unit}</small>
      </div>
      <MetricBar metric={props.metric} />
    </article>
  );
}

function MetricBar(props: { metric: CurrentMetric }) {
  const valuePct = () => pct(props.metric);
  return (
    <div class="km2-meter" aria-hidden="true">
      <span style={{ width: `${Math.round(valuePct() * 100)}%` }} />
      <i style={{ left: `${Math.round(valuePct() * 100)}%` }} />
    </div>
  );
}

function MetricGlyph(props: { metric: CurrentMetric; compact?: boolean }) {
  const key = () => props.metric.key;
  return (
    <svg class={props.compact ? "km2-glyph compact" : "km2-glyph"} viewBox="0 0 40 40" aria-hidden="true">
      <Show when={key() === "temperature"}>
        <path d="M17 7a5 5 0 0 1 10 0v14a9 9 0 1 1-10 0z" />
        <path d="M22 11v15" />
        <path d="M29 9h5M29 16h4M29 23h5" />
      </Show>
      <Show when={key() === "humidity"}>
        <path d="M20 4C15 14 9 19 9 27a11 11 0 0 0 22 0c0-8-6-13-11-23z" />
        <path d="M15 27c3 4 7 4 10 0" />
      </Show>
      <Show when={key() === "co2"}>
        <path d="M8 25h22a7 7 0 0 0-2-13 10 10 0 0 0-19-1 7 7 0 0 0-1 14z" />
        <path d="M11 31c4-3 7 2 11-1s6-1 8 1" />
      </Show>
      <Show when={key() === "pm25"}>
        <circle cx="12" cy="13" r="4" />
        <circle cx="25" cy="11" r="3" />
        <circle cx="25" cy="25" r="5" />
        <circle cx="12" cy="26" r="3" />
        <circle cx="19" cy="19" r="2" />
      </Show>
      <Show when={key() === "voc"}>
        <path d="M10 25h20c4 0 6-3 6-6s-3-6-7-6A10 10 0 0 0 10 9a7 7 0 0 0 0 16z" />
        <path d="M13 30c5 3 10 3 15 0" />
      </Show>
      <Show when={key() === "nox"}>
        <path d="M22 3 9 21h10l-2 16 14-22H20z" />
        <path d="M7 9c3-2 6-2 9 0M25 31c3 2 6 2 9 0" />
      </Show>
    </svg>
  );
}

function sortMetrics(metrics: CurrentMetric[]) {
  return [...metrics].sort((a, b) => METRIC_ORDER.indexOf(a.key) - METRIC_ORDER.indexOf(b.key));
}

function pct(metric: CurrentMetric) {
  if (metric.value === null) return 0;
  return Math.max(0, Math.min(1, (metric.value - metric.min) / ((metric.max - metric.min) || 1)));
}

function accent(metric: CurrentMetric) {
  return METRIC_ACCENT[metric.key] ?? "var(--c-info)";
}

function formatValue(value: number | null) {
  if (value === null) return "--";
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

function shortLabel(metric: CurrentMetric) {
  if (metric.key === "temperature") return "Temp";
  if (metric.key === "humidity") return "Hum";
  return metric.label;
}

function statusText(status: Status) {
  if (status === "good") return "clear";
  if (status === "warning") return "watch";
  if (status === "critical") return "alert";
  return "quiet";
}
