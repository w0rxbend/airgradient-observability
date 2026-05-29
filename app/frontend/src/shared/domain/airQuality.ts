import { getMetric, type MetricKey } from "./metrics";

export type Status = "good" | "warning" | "critical" | "empty";
export type GaugeStatus = { txt: string; color: string };
export type DeltaDirection = "up" | "down" | "flat";
export type DeltaResult = { text: string; dir: DeltaDirection };
export type AqiInfo = { label: string; color: string; step: number; msg: string };

export const STATUS_COLOR: Record<Status, string> = {
  good: "var(--c-good)",
  warning: "var(--c-warning)",
  critical: "var(--c-critical)",
  empty: "var(--c-muted)",
};

export const STATUS_BG: Record<Status, string> = {
  good: "var(--c-good-bg)",
  warning: "var(--c-warning-bg)",
  critical: "var(--c-critical-bg)",
  empty: "var(--c-muted-bg)",
};

export const STATUS_LABEL: Record<Status, string> = {
  good: "Good",
  warning: "Moderate",
  critical: "Critical",
  empty: "No data",
};

export function statusColor(status: Status): string {
  return STATUS_COLOR[status] ?? STATUS_COLOR.empty;
}

export function statusLabel(status: Status): string {
  return STATUS_LABEL[status] ?? "Unknown";
}

export function classifyMetricStatus(
  metricKey: MetricKey,
  value: number | null,
  thresholds = getMetric(metricKey)
): Status {
  if (value === null) return "empty";
  if (thresholds.warnBelow !== undefined && value >= thresholds.warnBelow) return "critical";
  if (thresholds.goodBelow !== undefined && value >= thresholds.goodBelow) return "warning";
  return "good";
}

export function airQualityRecommendation(
  metrics: Array<{ key: string; status: Status }>
): string {
  const critical = metrics.filter((metric) => metric.status === "critical");
  const warnings = metrics.filter((metric) => metric.status === "warning");

  if (critical.some((metric) => metric.key === "co2")) return "High CO2 detected - open windows now";
  if (critical.some((metric) => metric.key === "pm25")) return "PM2.5 critical - reduce exposure";
  if (critical.some((metric) => metric.key === "voc")) return "VOC levels critical - ventilate immediately";
  if (critical.length > 0) return "Multiple pollutants elevated - ventilate";
  if (warnings.some((metric) => metric.key === "co2")) return "CO2 rising - consider ventilation";
  if (warnings.some((metric) => metric.key === "humidity")) return "Humidity out of range";
  if (warnings.length > 0) return "Air quality moderate - monitor closely";
  return "Air quality is good";
}

export function overallScore(metrics: Array<{ status: Status }>): number {
  const active = metrics.filter((metric) => metric.status !== "empty");
  if (active.length === 0) return 0;

  const sum = active.reduce((acc, metric) => acc + scoreContribution(metric.status), 0);
  return Math.round(sum / active.length);
}

export function scoreStatus(score: number): Status {
  if (score >= 75) return "good";
  if (score >= 40) return "warning";
  if (score > 0) return "critical";
  return "empty";
}

export function pm25ToAqi(value: number): number {
  if (value <= 12) return Math.round((value / 12) * 50);
  if (value <= 35.4) return Math.round(50 + ((value - 12) / (35.4 - 12)) * 50);
  if (value <= 55.4) return Math.round(100 + ((value - 35.4) / (55.4 - 35.4)) * 50);
  if (value <= 150) return Math.round(150 + ((value - 55.4) / (150 - 55.4)) * 50);
  return Math.round(200 + Math.min(150, value - 150));
}

export function aqiInfo(value: number): AqiInfo {
  if (value <= 50) {
    return {
      label: "GOOD",
      color: "var(--ks-g)",
      step: 1,
      msg: "Air quality is satisfactory. Open windows freely.",
    };
  }
  if (value <= 100) {
    return {
      label: "MODERATE",
      color: "var(--ks-y)",
      step: 2,
      msg: "Acceptable for most. Sensitive groups should monitor.",
    };
  }
  if (value <= 150) {
    return {
      label: "UNHEALTHY (S)",
      color: "var(--ks-a)",
      step: 3,
      msg: "Sensitive groups may experience symptoms.",
    };
  }
  if (value <= 200) {
    return {
      label: "UNHEALTHY",
      color: "var(--ks-o)",
      step: 4,
      msg: "Everyone may begin to feel effects. Limit exertion.",
    };
  }
  if (value <= 300) {
    return {
      label: "VERY UNHEALTHY",
      color: "var(--ks-r)",
      step: 5,
      msg: "Health alert. Avoid outdoor activity.",
    };
  }
  return {
    label: "HAZARDOUS",
    color: "var(--ks-p)",
    step: 6,
    msg: "Emergency conditions. Stay indoors with filtration.",
  };
}

export function aqiGaugeStatus(value: number): GaugeStatus {
  if (value <= 50) return { txt: "GOOD", color: "var(--gi-g-low)" };
  if (value <= 100) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (value <= 150) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return { txt: "CRITICAL", color: "var(--gi-g-top)" };
}

export function pm25GaugeStatus(value: number): GaugeStatus {
  if (value <= 12) return { txt: "GOOD", color: "var(--gi-g-low)" };
  if (value <= 25) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (value <= 50) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return { txt: "CRITICAL", color: "var(--gi-g-top)" };
}

export function co2GaugeStatus(value: number): GaugeStatus {
  if (value < 800) return { txt: "OPTIMAL", color: "var(--gi-g-low)" };
  if (value < 1200) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (value < 1800) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return { txt: "CRITICAL", color: "var(--gi-g-top)" };
}

export function vocGaugeStatus(value: number): GaugeStatus {
  if (value < 150) return { txt: "OPTIMAL", color: "var(--gi-g-low)" };
  if (value < 250) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (value < 400) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return { txt: "CRITICAL", color: "var(--gi-g-top)" };
}

export function noxGaugeStatus(value: number): GaugeStatus {
  if (value < 20) return { txt: "OPTIMAL", color: "var(--gi-g-low)" };
  if (value < 50) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (value < 150) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return { txt: "CRITICAL", color: "var(--gi-g-top)" };
}

export function temperatureGaugeStatus(value: number): GaugeStatus {
  if (value >= 20 && value <= 24) return { txt: "OPTIMAL", color: "var(--gi-g-low)" };
  if (value >= 18 && value <= 26) return { txt: "NORMAL", color: "var(--gi-g-low)" };
  if (value >= 16 && value <= 28) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  return { txt: "ELEVATED", color: "var(--gi-g-high)" };
}

export function humidityGaugeStatus(value: number): GaugeStatus {
  if (value >= 40 && value <= 60) return { txt: "OPTIMAL", color: "var(--gi-g-low)" };
  if (value >= 30 && value <= 70) return { txt: "NORMAL", color: "var(--gi-g-low)" };
  return { txt: "MODERATE", color: "var(--gi-g-mid)" };
}

export function dewPointGaugeStatus(value: number): GaugeStatus {
  if (value < 10) return { txt: "DRY", color: "var(--gi-g-mid)" };
  if (value < 16) return { txt: "OPTIMAL", color: "var(--gi-g-low)" };
  if (value < 21) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (value < 24) return { txt: "HUMID", color: "var(--gi-g-high)" };
  return { txt: "OPPRESSIVE", color: "var(--gi-g-top)" };
}

export function dewPoint(temperature: number, humidity: number): number {
  return temperature - (100 - humidity) / 5;
}

export function computeDelta(trend: number[], decimals = 1): DeltaResult {
  if (trend.length < 2) return { text: "-", dir: "flat" };
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const diff = last - prev;
  if (Math.abs(diff) < 0.05) return { text: "+/-0", dir: "flat" };
  const sign = diff > 0 ? "+" : "";
  const text = `${sign}${Math.abs(diff) >= 100 ? diff.toFixed(0) : diff.toFixed(decimals)}`;
  return { text, dir: diff > 0 ? "up" : "down" };
}

export function previousTrendValue(trend: number[], decimals = 1): string {
  if (trend.length < 2) return "-";
  const value = trend[trend.length - 2];
  return Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(decimals);
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function scoreContribution(status: Status) {
  switch (status) {
    case "good":
      return 100;
    case "warning":
      return 50;
    case "critical":
      return 10;
    case "empty":
      return 0;
  }
}
