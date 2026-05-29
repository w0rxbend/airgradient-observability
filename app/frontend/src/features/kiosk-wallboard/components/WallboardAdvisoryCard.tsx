import { aqiInfo, clamp01 } from "../../../shared/domain/airQuality";

type Props = {
  aqi:      number;
  pm25:     number;
  co2:      number;
  voc:      number;
  nox:      number;
  humidity: number;
};

function ventilationRec(co2: number, aqi: number): string {
  if (co2 > 1500 || aqi > 150) return "Open windows immediately — CO₂ critical or air quality poor.";
  if (co2 > 1000) return "Ventilate now — CO₂ above 1000 ppm. Open windows 15 min.";
  if (co2 > 800)  return "Consider brief ventilation. CO₂ approaching threshold.";
  return "Auto-cycle every 45 min · CO₂ within range · windows OK 04–07.";
}

function activityRec(aqi: number, voc: number): string {
  if (aqi > 200 || voc > 300) return "Avoid exertion indoors and out. Run HEPA at max speed.";
  if (aqi > 100 || voc > 100) return "Moderate activity OK indoors. Limit vigorous outdoor exercise.";
  return "Suitable for indoor and outdoor exercise. Conditions favorable.";
}

function filterRec(pm25: number, voc: number, nox: number): string {
  if (pm25 > 35 || voc > 300 || nox > 300) return "HEPA H13 + activated carbon · run at high speed now.";
  if (pm25 > 12 || voc > 100) return "HEPA H13 active · elevated particles or VOC detected.";
  return "HEPA H13 · auto mode active · monitoring continuously.";
}

function headline(info: ReturnType<typeof aqiInfo>, co2: number, humidity: number): string {
  if (humidity < 30) return "Low humidity detected — consider running a humidifier.";
  if (humidity > 65) return "High humidity — mould risk. Increase ventilation.";
  if (co2 > 1000)    return "CO₂ elevated — ventilate to restore indoor air quality.";
  if (info.step <= 2) return "Breathe easy — all indicators within healthy range.";
  if (info.step === 3) return "Sensitive groups should reduce prolonged exertion.";
  return "Limit outdoor activity. Enable filtration.";
}

export function WallboardAdvisoryCard(props: Props) {
  const info = () => aqiInfo(props.aqi);

  const pm25Pct = () => clamp01(props.pm25 / 15);       // WHO 24h limit 15 µg/m³
  const co2Pct  = () => clamp01(props.co2  / 1000);     // comfort ceiling 1000 ppm
  const humPct  = () => clamp01(props.humidity / 60);   // upper threshold 60 %

  return (
    <div class="ks-card ks-advisory">
      <div class="ks-card-hl" />
      <div class="ks-card-header">
        <div class="ks-card-title">
          <span class="ks-index">/ 03</span> Health Advisory
        </div>
        <span
          class="ks-tag"
          style={{
            color: info().color,
            "border-color": `color-mix(in srgb, ${info().color} 40%, transparent)`,
          }}
        >
          <span class="ks-led" style={{ background: info().color, "box-shadow": `0 0 8px ${info().color}` }} />
          LEVEL {info().step}/6
        </span>
      </div>
      <div class="ks-advisory-body">
        <div class="ks-advisory-headline">{headline(info(), props.co2, props.humidity)}</div>
        <div>
          <div class="ks-advisory-rec">
            <span class="ks-icon">01</span>
            <div><b>Ventilation</b> {ventilationRec(props.co2, props.aqi)}</div>
          </div>
          <div class="ks-advisory-rec">
            <span class="ks-icon">02</span>
            <div><b>Activity</b> {activityRec(props.aqi, props.voc)}</div>
          </div>
          <div class="ks-advisory-rec">
            <span class="ks-icon">03</span>
            <div><b>Filter</b> {filterRec(props.pm25, props.voc, props.nox)}</div>
          </div>
        </div>
        <div class="ks-compare-bar">
          <CompareRow lbl="PM2.5 vs WHO"  pct={pm25Pct()} color="var(--ks-signal)" val={`${props.pm25.toFixed(1)} µg/m³`} />
          <CompareRow lbl="CO₂ vs 1000"   pct={co2Pct()}  color="var(--ks-amber)"  val={`${Math.round(props.co2)} ppm`} />
          <CompareRow lbl="Humidity"       pct={humPct()}  color="var(--ks-diia)"   val={`${props.humidity.toFixed(0)}%`} />
        </div>
      </div>
    </div>
  );
}

function CompareRow(props: { lbl: string; pct: number; color: string; val: string }) {
  return (
    <div class="ks-compare-row">
      <span class="ks-compare-lbl">{props.lbl}</span>
      <span class="ks-compare-track">
        <span class="ks-compare-fill" style={{ width: `${props.pct * 100}%`, background: props.color }} />
      </span>
      <span class="ks-compare-val">{props.val}</span>
    </div>
  );
}
