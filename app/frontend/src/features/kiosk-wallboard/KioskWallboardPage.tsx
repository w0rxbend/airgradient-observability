import { createMemo, Match, Show, Switch } from "solid-js";
import { pm25ToAqi } from "../../shared/domain/airQuality";
import { formatMetricNumber } from "../../shared/domain/metrics";
import type { MetricKey } from "../../shared/domain/metrics";
import {
  buildPm25WeekMatrix,
  completeCurrentMetrics,
  metricHistoryMap,
  noxWallboardStatus,
  pm25WallboardStatus,
  vocWallboardStatus,
} from "./pageViewModel";
import { createClock } from "../../shared/time/clock";
import {
  createKioskWallboardData,
  wallboardRefreshMs,
} from "./createKioskWallboardData";
import { WallboardAdvisoryCard } from "./components/WallboardAdvisoryCard";
import { WallboardCO2Card } from "./components/WallboardCO2Card";
import { WallboardEventLog } from "./components/WallboardEventLog";
import { WallboardHeroAqi } from "./components/WallboardHeroAqi";
import { WallboardHumidityCard } from "./components/WallboardHumidityCard";
import { WallboardStatTile } from "./components/WallboardStatTile";
import { WallboardTemperatureCard } from "./components/WallboardTemperatureCard";
import { WallboardTrendCard } from "./components/WallboardTrendCard";
import { WallboardWeekHeatmap } from "./components/WallboardWeekHeatmap";
import "./kioskWallboard.css";

export default function KioskWallboardPage() {
  const now = createClock();
  const data = createKioskWallboardData();

  const current = data.current;
  const currentData = data.currentData;
  const historyMap = createMemo(() => metricHistoryMap(data.historyData()));
  const values = createMemo(() => completeCurrentMetrics(currentData()));
  const getSeries = (key: MetricKey) => historyMap()[key] ?? [];
  const pm25Status = createMemo(() => pm25WallboardStatus(values()?.pm25));
  const vocStatus = createMemo(() => vocWallboardStatus(values()?.voc));
  const noxStatus = createMemo(() => noxWallboardStatus(values()?.nox));
  const weekMatrix = createMemo(() => buildPm25WeekMatrix(data.weeklyRaw()));

  const timeStr = () =>
    now().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  const dateStr = () =>
    now()
      .toLocaleDateString("en-GB", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .toUpperCase();

  const uplinkAge = () => {
    const timestamp = currentData()?.timestamp;
    if (!timestamp) return "-";
    const seconds = Math.round((Date.now() - timestamp) / 1000);
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;
  };

  return (
    <div class="ks-stage">
      <div class="ks-canvas">
        <div class="ks-topbar">
          <div class="ks-brand">
            <div class="ks-brand-mark">AG</div>
            <div class="ks-brand-text">
              <span class="ks-name">AIR ONE - WALLBOARD</span>
              <span class="ks-sub">
                Live indoor air quality - auto-refresh {wallboardRefreshMs / 1000}s
              </span>
            </div>
          </div>

          <div class="ks-topbar-right">
            <Show
              when={!current.error}
              fallback={
                <span class="ks-netpill" style={{ "border-color": "rgba(255,44,90,0.3)" }}>
                  <span
                    style={{
                      width: "7px",
                      height: "7px",
                      "border-radius": "50%",
                      background: "var(--ks-r)",
                      display: "inline-block",
                    }}
                  />{" "}
                  OFFLINE
                </span>
              }
            >
              <span class="ks-netpill">
                <span class="ks-led-green" /> ONLINE
              </span>
            </Show>
            <span class="ks-uplink">
              UPLINK <b class="ks-mono">{uplinkAge()}</b> AGO
            </span>
            <div class="ks-clock">
              <span class="ks-date">{dateStr()}</span>
              <span class="ks-time ks-mono">{timeStr()}</span>
            </div>
          </div>
        </div>

        <Switch>
          <Match when={current.loading && !currentData()}>
            <div class="ks-card ks-advisory">
              <div class="ks-advisory-headline">Connecting to AirGradient backend.</div>
            </div>
          </Match>
          <Match when={(current.error && !currentData()) || (currentData() && !values())}>
            <div class="ks-card ks-advisory">
              <div class="ks-advisory-headline">
                {current.error ? "Backend unavailable." : "Current sample is incomplete."}
              </div>
              <div class="ks-advisory-rec">
                <span class="ks-icon">!</span>
                <div>Waiting for a complete sensor sample before rendering air quality values.</div>
              </div>
            </div>
          </Match>
          <Match when={values()}>
            {(sample) => (
              <div class="ks-grid">
                <WallboardHeroAqi value={pm25ToAqi(sample().pm25)} />
                <WallboardTrendCard pm25={getSeries("pm25")} voc={getSeries("voc")} />
                <WallboardAdvisoryCard
                  aqi={pm25ToAqi(sample().pm25)}
                  pm25={sample().pm25}
                  co2={sample().co2}
                  voc={sample().voc}
                  nox={sample().nox}
                  humidity={sample().humidity}
                />

                <WallboardStatTile
                  tileClass="ks-tile-pm25"
                  idx={5}
                  label="PM2.5"
                  value={formatMetricNumber(sample().pm25)}
                  unit="ug/m3"
                  sub="2.5 um fine particles"
                  statusTxt={pm25Status().txt}
                  color={pm25Status().color}
                  series={getSeries("pm25")}
                  rampStep={pm25Status().step}
                />
                <WallboardStatTile
                  tileClass="ks-tile-voc"
                  idx={6}
                  label="TVOC"
                  value={String(Math.round(sample().voc))}
                  unit="ppb"
                  sub="SGP41 index"
                  statusTxt={vocStatus().txt}
                  color={vocStatus().color}
                  series={getSeries("voc")}
                  rampStep={vocStatus().step}
                />
                <WallboardStatTile
                  tileClass="ks-tile-nox"
                  idx={7}
                  label="NOx"
                  value={String(Math.round(sample().nox))}
                  unit="idx"
                  sub="1h scaled 0-100"
                  statusTxt={noxStatus().txt}
                  color={noxStatus().color}
                  series={getSeries("nox")}
                  rampStep={noxStatus().step}
                />

                <WallboardCO2Card value={sample().co2} series={getSeries("co2")} />
                <WallboardTemperatureCard value={sample().temperature} series={getSeries("temperature")} />
                <WallboardHumidityCard value={sample().humidity} series={getSeries("humidity")} />
                <WallboardWeekHeatmap matrix={weekMatrix()} />
                <WallboardEventLog
                  co2={sample().co2}
                  pm25={sample().pm25}
                  voc={sample().voc}
                  nox={sample().nox}
                  temperature={sample().temperature}
                  humidity={sample().humidity}
                  timestamp={currentData()?.timestamp ?? null}
                />
              </div>
            )}
          </Match>
        </Switch>
      </div>
    </div>
  );
}
