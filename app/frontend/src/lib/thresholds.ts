export type Status = "good" | "warning" | "critical" | "empty";

export const STATUS_COLOR: Record<Status, string> = {
  good: "var(--c-good)",
  warning: "var(--c-warning)",
  critical: "var(--c-critical)",
  empty: "var(--c-muted)"
};

export const STATUS_BG: Record<Status, string> = {
  good: "var(--c-good-bg)",
  warning: "var(--c-warning-bg)",
  critical: "var(--c-critical-bg)",
  empty: "var(--c-muted-bg)"
};

export const STATUS_LABEL: Record<Status, string> = {
  good: "Good",
  warning: "Moderate",
  critical: "Critical",
  empty: "No data"
};

export function statusColor(status: Status): string {
  return STATUS_COLOR[status] ?? STATUS_COLOR.empty;
}

export function statusLabel(status: Status): string {
  return STATUS_LABEL[status] ?? "Unknown";
}

export function airQualityRecommendation(
  metrics: Array<{ key: string; status: Status }>
): string {
  const critical = metrics.filter(m => m.status === "critical");
  const warnings = metrics.filter(m => m.status === "warning");

  if (critical.some(m => m.key === "co2")) return "High CO₂ detected — open windows now";
  if (critical.some(m => m.key === "pm25")) return "PM2.5 critical — reduce exposure";
  if (critical.some(m => m.key === "voc")) return "VOC levels critical — ventilate immediately";
  if (critical.length > 0) return "Multiple pollutants elevated — ventilate";
  if (warnings.some(m => m.key === "co2")) return "CO₂ rising — consider ventilation";
  if (warnings.some(m => m.key === "humidity")) return "Humidity out of range";
  if (warnings.length > 0) return "Air quality moderate — monitor closely";
  return "Air quality is good";
}

export function overallScore(metrics: Array<{ status: Status }>): number {
  const active = metrics.filter(m => m.status !== "empty");
  if (active.length === 0) return 0;
  const sum = active.reduce((acc, m) => {
    switch (m.status) {
      case "good": return acc + 100;
      case "warning": return acc + 50;
      case "critical": return acc + 10;
      default: return acc;
    }
  }, 0);
  return Math.round(sum / active.length);
}

export function scoreStatus(score: number): Status {
  if (score >= 75) return "good";
  if (score >= 40) return "warning";
  if (score > 0) return "critical";
  return "empty";
}
