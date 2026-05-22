import {
  createMemo,
  createResource,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { fetchCurrent, fetchAllRanges, fetchRangeRaw } from "../lib/backend";
import { pm25ToAqi, fmtNum } from "../lib/swag";
import type { WeekRow } from "../lib/swag";
import { SwagHeroAQI }     from "../components/SwagHeroAQI";
import { SwagTrendCard }   from "../components/SwagTrendCard";
import { SwagAdvisoryCard } from "../components/SwagAdvisoryCard";
import { SwagCO2Card }     from "../components/SwagCO2Card";
import { SwagStatTile }    from "../components/SwagStatTile";
import { SwagTempCard }    from "../components/SwagTempCard";
import { SwagHumCard }     from "../components/SwagHumCard";
import { SwagWeekHeatmap } from "../components/SwagWeekHeatmap";
import { SwagEventLog }    from "../components/SwagEventLog";
import "../kiosk-swag.css";

const REFRESH_MS = 5_000;

export default function KioskSwag() {
  const [tick, setTick] = createSignal(0);
  const [now,  setNow]  = createSignal(new Date());

  onMount(() => {
    const dataTimer  = setInterval(() => setTick(n => n + 1), REFRESH_MS);
    const clockTimer = setInterval(() => setNow(new Date()), 1000);
    onCleanup(() => {
      clearInterval(dataTimer);
      clearInterval(clockTimer);
    });
  });

  const [current]   = createResource(tick, () => fetchCurrent());
  const [history]   = createResource(tick, () => fetchAllRanges("24h"));
  const [weeklyRaw] = createResource(tick, () => fetchRangeRaw("pm25", "7d", "1h"));

  const historyMap = createMemo(() => {
    const m: Record<string, number[]> = {};
    for (const r of history() ?? []) {
      m[r.metric] = r.points.map(([_ts, v]) => v);
    }
    return m;
  });

  const getVal    = (key: string) => current()?.metrics.find(m => m.key === key)?.value ?? 0;
  const getSeries = (key: string) => historyMap()[key] ?? [];

  const pm25Val = () => getVal("pm25");
  const co2Val  = () => getVal("co2");
  const vocVal  = () => getVal("voc");
  const noxVal  = () => getVal("nox");
  const tempVal = () => getVal("temperature");
  const humVal  = () => getVal("humidity");

  const aqi = createMemo(() => pm25ToAqi(pm25Val()));

  const pm25Status = createMemo(() => {
    const v = pm25Val();
    if (v < 12) return { txt: "GOOD",      color: "var(--ks-g)", step: 1 };
    if (v < 25) return { txt: "MOD",       color: "var(--ks-y)", step: 2 };
    if (v < 40) return { txt: "HIGH",      color: "var(--ks-o)", step: 4 };
    return        { txt: "VERY HIGH", color: "var(--ks-r)", step: 5 };
  });

  const vocStatus = createMemo(() => {
    const v = vocVal();
    if (v < 100) return { txt: "OK",   color: "var(--ks-signal)", step: 2 };
    if (v < 300) return { txt: "MOD",  color: "var(--ks-amber)",  step: 3 };
    return         { txt: "HIGH",  color: "var(--ks-r)",      step: 4 };
  });

  const noxStatus = createMemo(() => {
    const v = noxVal();
    if (v < 100) return { txt: "LOW",  color: "var(--ks-green)", step: 1 };
    if (v < 300) return { txt: "MOD",  color: "var(--ks-amber)", step: 3 };
    return         { txt: "HIGH",  color: "var(--ks-r)",     step: 5 };
  });

  const weekMatrix = createMemo<WeekRow[]>(() => {
    const raw  = weeklyRaw();
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const sums:   number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    if (raw) {
      const weekAgo = Date.now() - 7 * 24 * 3_600_000;
      for (const [ts, v] of raw.points) {
        if (ts < weekAgo) continue;
        const d   = new Date(ts);
        const dow  = (d.getDay() + 6) % 7;
        const hour = d.getHours();
        sums[dow][hour]   += v;
        counts[dow][hour] += 1;
      }
    }

    return days.map((day, di) => ({
      day,
      hours: Array.from({ length: 24 }, (_, h) =>
        counts[di][h] > 0 ? sums[di][h] / counts[di][h] : 0
      ),
    }));
  });

  const timeStr = () =>
    now().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
  const dateStr = () =>
    now().toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const uplinkAge = () => {
    const ts = current()?.timestamp;
    if (!ts) return "—";
    const sec = Math.round((Date.now() - ts) / 1000);
    return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m`;
  };

  return (
    <div class="ks-stage">
      <div class="ks-canvas">

        {/* ── Topbar ────────────────────────────────────────────── */}
        <div class="ks-topbar">
          <div class="ks-brand">
            <div class="ks-brand-mark">AG</div>
            <div class="ks-brand-text">
              <span class="ks-name">AIR ONE · KIOSK</span>
              <span class="ks-sub">Live indoor air quality · auto-refresh {REFRESH_MS / 1000}s</span>
            </div>
          </div>

          <div class="ks-topbar-right">
            <Show when={!current.error} fallback={
              <span class="ks-netpill" style={{ "border-color": "rgba(255,44,90,0.3)" }}>
                <span style={{ width: "7px", height: "7px", "border-radius": "50%", background: "var(--ks-r)", display: "inline-block" }} /> OFFLINE
              </span>
            }>
              <span class="ks-netpill"><span class="ks-led-green" /> ONLINE</span>
            </Show>
            <span class="ks-uplink">UPLINK <b class="ks-mono">{uplinkAge()}</b> AGO</span>
            <div class="ks-clock">
              <span class="ks-date">{dateStr()}</span>
              <span class="ks-time ks-mono">{timeStr()}</span>
            </div>
          </div>
        </div>

        {/* ── Main grid ─────────────────────────────────────────── */}
        <div class="ks-grid">
          {/* Row 1 */}
          <SwagHeroAQI     value={aqi()} />
          <SwagTrendCard   pm25={getSeries("pm25")} voc={getSeries("voc")} />
          <SwagAdvisoryCard
            aqi={aqi()}
            pm25={pm25Val()}
            co2={co2Val()}
            voc={vocVal()}
            nox={noxVal()}
            humidity={humVal()}
          />

          {/* Row 2 — stat tiles, each span 4 */}
          <SwagStatTile
            tileClass="ks-tile-pm25"
            idx={5} label="PM2.5"
            value={fmtNum(pm25Val())} unit="µg/m³"
            sub="2.5 µm fine particles"
            statusTxt={pm25Status().txt}
            color={pm25Status().color}
            series={getSeries("pm25")}
            rampStep={pm25Status().step}
          />
          <SwagStatTile
            tileClass="ks-tile-voc"
            idx={6} label="TVOC"
            value={String(Math.round(vocVal()))} unit="ppb"
            sub="SGP41 index"
            statusTxt={vocStatus().txt}
            color={vocStatus().color}
            series={getSeries("voc")}
            rampStep={vocStatus().step}
          />
          <SwagStatTile
            tileClass="ks-tile-nox"
            idx={7} label="NOx"
            value={String(Math.round(noxVal()))} unit="idx"
            sub="1h scaled 0–100"
            statusTxt={noxStatus().txt}
            color={noxStatus().color}
            series={getSeries("nox")}
            rampStep={noxStatus().step}
          />

          {/* Row 3 — co2(3) + temp(2) + hum(2) + week(3) + events(2) */}
          <SwagCO2Card     value={co2Val()}  series={getSeries("co2")} />
          <SwagTempCard    value={tempVal()} series={getSeries("temperature")} />
          <SwagHumCard     value={humVal()}  series={getSeries("humidity")} />
          <SwagWeekHeatmap matrix={weekMatrix()} />
          <SwagEventLog
            co2={co2Val()}
            pm25={pm25Val()}
            voc={vocVal()}
            nox={noxVal()}
            temperature={tempVal()}
            humidity={humVal()}
            timestamp={current()?.timestamp ?? null}
          />
        </div>
      </div>
    </div>
  );
}
