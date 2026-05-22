import {
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { fetchCurrent, fetchAllRanges } from "../lib/backend";
import { pm25ToAqi } from "../lib/swag";
import { dewPoint } from "../lib/gauges";
import { GaugeAQI }      from "../components/gauges/GaugeAQI";
import { GaugePM25 }     from "../components/gauges/GaugePM25";
import { GaugeCO2 }      from "../components/gauges/GaugeCO2";
import { GaugeTemp }     from "../components/gauges/GaugeTemp";
import { GaugeTVOC }     from "../components/gauges/GaugeTVOC";
import { GaugeNOx }      from "../components/gauges/GaugeNOx";
import { GaugeHum }      from "../components/gauges/GaugeHum";
import { GaugeDewPoint } from "../components/gauges/GaugeDewPoint";
import "../kiosk-gauges.css";

const REFRESH_MS = 5_000;

export default function KioskGauges() {
  const [tick, setTick] = createSignal(0);
  const [now,  setNow]  = createSignal(new Date());

  onMount(() => {
    const dataTimer  = setInterval(() => setTick(n => n + 1), REFRESH_MS);
    const clockTimer = setInterval(() => setNow(new Date()), 1_000);
    onCleanup(() => {
      clearInterval(dataTimer);
      clearInterval(clockTimer);
    });
  });

  const [current] = createResource(tick, () => fetchCurrent());
  const [history] = createResource(tick, () => fetchAllRanges("24h"));

  // ── Derived history map ──────────────────────────────────────────
  const historyMap = createMemo(() => {
    const m: Record<string, number[]> = {};
    for (const r of history() ?? []) {
      m[r.metric] = r.points.map(([_ts, v]) => v);
    }
    return m;
  });

  const getVal    = (key: string) =>
    current()?.metrics.find(m => m.key === key)?.value ?? null;
  const getSeries = (key: string) => historyMap()[key] ?? [];

  // ── Current metric accessors ─────────────────────────────────────
  const pm25Val = () => getVal("pm25");
  const co2Val  = () => getVal("co2");
  const vocVal  = () => getVal("voc");
  const noxVal  = () => getVal("nox");
  const tempVal = () => getVal("temperature");
  const humVal  = () => getVal("humidity");

  // ── Derived values ───────────────────────────────────────────────
  const aqiVal = () => {
    const v = pm25Val();
    return v !== null ? pm25ToAqi(v) : null;
  };

  const dpVal = () => {
    const t = tempVal();
    const h = humVal();
    return t !== null && h !== null ? dewPoint(t, h) : null;
  };

  // ── Derived trend series ─────────────────────────────────────────
  const aqiTrend = createMemo(() =>
    getSeries("pm25").map(v => pm25ToAqi(v))
  );

  const dpTrend = createMemo(() => {
    const temps = getSeries("temperature");
    const hums  = getSeries("humidity");
    const len   = Math.min(temps.length, hums.length);
    return Array.from({ length: len }, (_, i) => dewPoint(temps[i], hums[i]));
  });

  // ── Status bar helpers ───────────────────────────────────────────
  const uplinkAge = () => {
    const ts = current()?.timestamp;
    if (!ts) return "—";
    const sec = Math.round((Date.now() - ts) / 1_000);
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m`;
  };

  const timeStr = () =>
    now().toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });

  const dateStr = () =>
    now().toLocaleDateString("en-GB", {
      weekday: "short", day: "2-digit", month: "short", year: "numeric",
    }).toUpperCase();

  return (
    <div class="gi-stage">
      <div class="gi-canvas">

        {/* ── Topbar ──────────────────────────────────────────────── */}
        <div class="gi-topbar">
          <div class="gi-brand">
            <span class="gi-brand-mark">AG</span>
            <div class="gi-brand-text">
              <span class="gi-brand-name">AIR ONE · GAUGES</span>
              <span class="gi-brand-sub">
                Live indoor air quality · auto-refresh {REFRESH_MS / 1_000}s
              </span>
            </div>
          </div>

          <div class="gi-topbar-right">
            <Show
              when={!current.error}
              fallback={
                <span class="gi-netpill gi-netpill--offline">
                  <span class="gi-netdot" style={{ background: "var(--gi-g-top)" }} />
                  OFFLINE
                </span>
              }
            >
              <span class="gi-netpill">
                <span class="gi-netdot" />
                LIVE
              </span>
            </Show>

            <Show when={current() && !current.error}>
              <span class="gi-uplink">
                UPLINK <strong class="gi-mono">{uplinkAge()}</strong> AGO
              </span>
            </Show>

            <div class="gi-clock">
              <span class="gi-clock-date">{dateStr()}</span>
              <span class="gi-clock-time gi-mono">{timeStr()}</span>
            </div>
          </div>
        </div>

        {/* ── Gauge grid ──────────────────────────────────────────── */}
        <Show
          when={!current.error}
          fallback={
            <div class="gi-error">
              <span class="gi-error-icon">⚠</span>
              <span>Backend unavailable — check API connection</span>
              <code>UPLINK ERROR · {String(current.error)}</code>
            </div>
          }
        >
          <div class="gi-grid">
            <GaugeAQI      value={aqiVal()}  trend={aqiTrend()} />
            <GaugePM25     value={pm25Val()} trend={getSeries("pm25")} />
            <GaugeCO2      value={co2Val()}  trend={getSeries("co2")} />
            <GaugeTemp     value={tempVal()} trend={getSeries("temperature")} />
            <GaugeTVOC     value={vocVal()}  trend={getSeries("voc")} />
            <GaugeNOx      value={noxVal()}  trend={getSeries("nox")} />
            <GaugeHum      value={humVal()}  trend={getSeries("humidity")} />
            <GaugeDewPoint value={dpVal()}   trend={dpTrend()} />
          </div>
        </Show>

      </div>
    </div>
  );
}
