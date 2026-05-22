// Shared helpers for the Swag* kiosk components.

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function pm25ToAqi(v: number): number {
  if (v <= 12)   return Math.round((v / 12) * 50);
  if (v <= 35.4) return Math.round(50  + ((v - 12)   / (35.4 - 12))   * 50);
  if (v <= 55.4) return Math.round(100 + ((v - 35.4) / (55.4 - 35.4)) * 50);
  if (v <= 150)  return Math.round(150 + ((v - 55.4) / (150  - 55.4)) * 50);
  return Math.round(200 + Math.min(150, v - 150));
}

export type AqiInfo = { label: string; color: string; step: number; msg: string };

export function aqiInfo(v: number): AqiInfo {
  if (v <= 50)  return { label: "GOOD",           color: "var(--ks-g)", step: 1, msg: "Air quality is satisfactory. Open windows freely." };
  if (v <= 100) return { label: "MODERATE",       color: "var(--ks-y)", step: 2, msg: "Acceptable for most. Sensitive groups should monitor." };
  if (v <= 150) return { label: "UNHEALTHY (S)",  color: "var(--ks-a)", step: 3, msg: "Sensitive groups may experience symptoms." };
  if (v <= 200) return { label: "UNHEALTHY",      color: "var(--ks-o)", step: 4, msg: "Everyone may begin to feel effects. Limit exertion." };
  if (v <= 300) return { label: "VERY UNHEALTHY", color: "var(--ks-r)", step: 5, msg: "Health alert. Avoid outdoor activity." };
  return          { label: "HAZARDOUS",           color: "var(--ks-p)", step: 6, msg: "Emergency conditions. Stay indoors with filtration." };
}

export function fmtNum(v: number | null, decimals = 1): string {
  if (v === null) return "—";
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(decimals);
}

export type WeekRow  = { day: string; hours: number[] };
export type FlatCell = { type: "label"; day: string } | { type: "cell"; v: number };
