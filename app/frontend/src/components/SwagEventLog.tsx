import { For } from "solid-js";

type Props = {
  co2:         number;
  pm25:        number;
  voc:         number;
  nox:         number;
  temperature: number;
  humidity:    number;
  timestamp:   number | null;
};

type Level = "ok" | "info" | "warn" | "crit";
type Event = { t: string; lvl: Level; msg: string };

function deriveEvents(p: Props): Event[] {
  const out: Event[] = [];

  // Always first: connectivity / refresh heartbeat
  out.push({ t: "live", lvl: "ok", msg: "All sensors nominal · auto-refresh every 5s" });

  // CO₂
  if (p.co2 > 0) {
    if (p.co2 > 1500)      out.push({ t: "co2",  lvl: "crit", msg: `CO₂ critical · ${Math.round(p.co2)} ppm · ventilate immediately` });
    else if (p.co2 > 1000) out.push({ t: "co2",  lvl: "warn", msg: `CO₂ elevated · ${Math.round(p.co2)} ppm · consider ventilating` });
    else                   out.push({ t: "co2",  lvl: "ok",   msg: `CO₂ nominal · ${Math.round(p.co2)} ppm` });
  }

  // PM2.5
  if (p.pm25 > 35)      out.push({ t: "pm2.5", lvl: "crit", msg: `PM2.5 unhealthy · ${p.pm25.toFixed(1)} µg/m³ · run HEPA filter` });
  else if (p.pm25 > 12) out.push({ t: "pm2.5", lvl: "warn", msg: `PM2.5 above WHO limit · ${p.pm25.toFixed(1)} µg/m³` });

  // VOC
  if (p.voc > 300)      out.push({ t: "voc",   lvl: "crit", msg: `TVOC high · ${Math.round(p.voc)} ppb · improve ventilation` });
  else if (p.voc > 100) out.push({ t: "voc",   lvl: "warn", msg: `TVOC elevated · ${Math.round(p.voc)} ppb` });

  // NOx
  if (p.nox > 300)      out.push({ t: "nox",   lvl: "crit", msg: `NOx high · ${Math.round(p.nox)} idx` });
  else if (p.nox > 100) out.push({ t: "nox",   lvl: "warn", msg: `NOx elevated · ${Math.round(p.nox)} idx` });

  // Humidity
  if (p.humidity > 65)      out.push({ t: "hum",  lvl: "warn", msg: `Humidity high · ${p.humidity.toFixed(0)}% · mould risk` });
  else if (p.humidity < 30) out.push({ t: "hum",  lvl: "warn", msg: `Humidity low · ${p.humidity.toFixed(0)}% · consider humidifier` });

  // Temperature
  if (p.temperature > 28)      out.push({ t: "temp", lvl: "warn", msg: `Temperature high · ${p.temperature.toFixed(1)}°C` });
  else if (p.temperature < 16) out.push({ t: "temp", lvl: "warn", msg: `Temperature low · ${p.temperature.toFixed(1)}°C` });

  // System: data timestamp age
  if (p.timestamp) {
    const sec = Math.round((Date.now() - p.timestamp) / 1000);
    if (sec < 60) out.push({ t: "system", lvl: "info", msg: `Data pipeline connected · last update ${sec}s ago` });
  }

  return out.slice(0, 5);
}

export function SwagEventLog(props: Props) {
  const events = () => deriveEvents(props);

  return (
    <div class="ks-card ks-events">
      <div class="ks-card-hl" />
      <div class="ks-card-header">
        <div class="ks-card-title"><span class="ks-index">/ 12</span> Event Log</div>
        <span class="ks-card-eyebrow">system</span>
      </div>
      <div class="ks-events-list">
        <For each={events()}>
          {(e) => (
            <div class="ks-event-item">
              <span class="ks-event-time">{e.t}</span>
              <span class="ks-event-msg">{e.msg}</span>
              <span class={`ks-event-level ks-${e.lvl}`}>{e.lvl}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
