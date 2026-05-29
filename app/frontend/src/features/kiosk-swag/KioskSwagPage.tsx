import { createMemo, Match, Show, Switch } from "solid-js";
import { SwagAdvisoryCard } from "../../components/SwagAdvisoryCard";
import { SwagCO2Card } from "../../components/SwagCO2Card";
import { SwagEventLog } from "../../components/SwagEventLog";
import { SwagHeroAQI } from "../../components/SwagHeroAQI";
import { SwagHumCard } from "../../components/SwagHumCard";
import { SwagStatTile } from "../../components/SwagStatTile";
import { SwagTempCard } from "../../components/SwagTempCard";
import { SwagTrendCard } from "../../components/SwagTrendCard";
import { SwagWeekHeatmap } from "../../components/SwagWeekHeatmap";
import { fmtNum, pm25ToAqi, type WeekRow } from "../../lib/swag";
import {
  fetchAllRanges,
  fetchCurrent,
  fetchRangeRaw,
  type CurrentResponse,
} from "../../shared/api/backendClient";
import type { MetricKey } from "../../shared/domain/metrics";
import { createPollingResource } from "../../shared/solid/pollingResource";
import { createClock } from "../../shared/time/clock";
import "../../kiosk-swag.css";

type SwagValues = {
  pm25: number;
  co2: number;
  voc: number;
  nox: number;
  temperature: number;
  humidity: number;
};

const refreshMs = 5_000;

export default function KioskSwagPage() {
  const now = createClock();
  const currentMetrics = createPollingResource(fetchCurrent, refreshMs);
  const history = createPollingResource(() => fetchAllRanges("24h"), refreshMs);
  const weekly = createPollingResource(() => fetchRangeRaw("pm25", "7d", "1h"), refreshMs);

  const current = currentMetrics.resource;
  const currentData = createMemo(() => currentMetrics.latest());
  const historyData = createMemo(() => history.latest());
  const weeklyRaw = createMemo(() => weekly.latest());

  const historyMap = createMemo(() => {
    const values: Partial<Record<MetricKey, number[]>> = {};
    for (const response of historyData() ?? []) {
      values[response.metric] = response.points.map(([_timestamp, value]) => value);
    }
    return values;
  });

  const values = createMemo(() => completeValues(currentData()));
  const getSeries = (key: MetricKey) => historyMap()[key] ?? [];
  const pm25Status = createMemo(() => {
    const sample = values();
    if (!sample) return unavailableStatus();
    if (sample.pm25 < 12) return { txt: "GOOD", color: "var(--ks-g)", step: 1 };
    if (sample.pm25 < 25) return { txt: "MOD", color: "var(--ks-y)", step: 2 };
    if (sample.pm25 < 40) return { txt: "HIGH", color: "var(--ks-o)", step: 4 };
    return { txt: "VERY HIGH", color: "var(--ks-r)", step: 5 };
  });

  const vocStatus = createMemo(() => {
    const sample = values();
    if (!sample) return unavailableStatus();
    if (sample.voc < 100) return { txt: "OK", color: "var(--ks-signal)", step: 2 };
    if (sample.voc < 300) return { txt: "MOD", color: "var(--ks-amber)", step: 3 };
    return { txt: "HIGH", color: "var(--ks-r)", step: 4 };
  });

  const noxStatus = createMemo(() => {
    const sample = values();
    if (!sample) return unavailableStatus();
    if (sample.nox < 100) return { txt: "LOW", color: "var(--ks-green)", step: 1 };
    if (sample.nox < 300) return { txt: "MOD", color: "var(--ks-amber)", step: 3 };
    return { txt: "HIGH", color: "var(--ks-r)", step: 5 };
  });

  const weekMatrix = createMemo<WeekRow[]>(() => {
    const raw = weeklyRaw();
    const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const sums: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const counts: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    if (raw) {
      const weekAgo = Date.now() - 7 * 24 * 3_600_000;
      for (const [timestamp, value] of raw.points) {
        if (timestamp < weekAgo) continue;

        const date = new Date(timestamp);
        const dayIndex = (date.getDay() + 6) % 7;
        const hour = date.getHours();
        sums[dayIndex][hour] += value;
        counts[dayIndex][hour] += 1;
      }
    }

    return days.map((day, dayIndex) => ({
      day,
      hours: Array.from({ length: 24 }, (_, hour) =>
        counts[dayIndex][hour] > 0 ? sums[dayIndex][hour] / counts[dayIndex][hour] : 0
      ),
    }));
  });

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
              <span class="ks-name">AIR ONE - KIOSK</span>
              <span class="ks-sub">Live indoor air quality - auto-refresh {refreshMs / 1000}s</span>
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
                <SwagHeroAQI value={pm25ToAqi(sample().pm25)} />
                <SwagTrendCard pm25={getSeries("pm25")} voc={getSeries("voc")} />
                <SwagAdvisoryCard
                  aqi={pm25ToAqi(sample().pm25)}
                  pm25={sample().pm25}
                  co2={sample().co2}
                  voc={sample().voc}
                  nox={sample().nox}
                  humidity={sample().humidity}
                />

                <SwagStatTile
                  tileClass="ks-tile-pm25"
                  idx={5}
                  label="PM2.5"
                  value={fmtNum(sample().pm25)}
                  unit="ug/m3"
                  sub="2.5 um fine particles"
                  statusTxt={pm25Status().txt}
                  color={pm25Status().color}
                  series={getSeries("pm25")}
                  rampStep={pm25Status().step}
                />
                <SwagStatTile
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
                <SwagStatTile
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

                <SwagCO2Card value={sample().co2} series={getSeries("co2")} />
                <SwagTempCard value={sample().temperature} series={getSeries("temperature")} />
                <SwagHumCard value={sample().humidity} series={getSeries("humidity")} />
                <SwagWeekHeatmap matrix={weekMatrix()} />
                <SwagEventLog
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

function completeValues(current: CurrentResponse | undefined): SwagValues | null {
  if (!current) return null;

  const pm25 = metricValue(current, "pm25");
  const co2 = metricValue(current, "co2");
  const voc = metricValue(current, "voc");
  const nox = metricValue(current, "nox");
  const temperature = metricValue(current, "temperature");
  const humidity = metricValue(current, "humidity");

  if (
    pm25 === null ||
    co2 === null ||
    voc === null ||
    nox === null ||
    temperature === null ||
    humidity === null
  ) {
    return null;
  }

  return { pm25, co2, voc, nox, temperature, humidity };
}

function metricValue(current: CurrentResponse, key: MetricKey) {
  return current.metrics.find((metric) => metric.key === key)?.value ?? null;
}

function unavailableStatus() {
  return { txt: "NO DATA", color: "var(--ks-paper-2)", step: 0 };
}
