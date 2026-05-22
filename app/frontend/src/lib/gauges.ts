// Shared helpers for the GaugeI (kiosk-gauges) components.

export type GaugeStatus = { txt: string; color: string };

// ─── Status helpers ───────────────────────────────────────────────

export function aqiStatus(v: number): GaugeStatus {
  if (v <= 50)  return { txt: "GOOD",     color: "var(--gi-g-low)" };
  if (v <= 100) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (v <= 150) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return              { txt: "CRITICAL",  color: "var(--gi-g-top)" };
}

export function pm25Status(v: number): GaugeStatus {
  if (v <= 12) return { txt: "GOOD",     color: "var(--gi-g-low)" };
  if (v <= 25) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (v <= 50) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return             { txt: "CRITICAL",  color: "var(--gi-g-top)" };
}

export function co2Status(v: number): GaugeStatus {
  if (v < 800)  return { txt: "OPTIMAL",  color: "var(--gi-g-low)" };
  if (v < 1200) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (v < 1800) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return              { txt: "CRITICAL",  color: "var(--gi-g-top)" };
}

export function vocStatus(v: number): GaugeStatus {
  if (v < 150) return { txt: "OPTIMAL",  color: "var(--gi-g-low)" };
  if (v < 250) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (v < 400) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return             { txt: "CRITICAL",  color: "var(--gi-g-top)" };
}

export function noxStatus(v: number): GaugeStatus {
  if (v < 20)  return { txt: "OPTIMAL",  color: "var(--gi-g-low)" };
  if (v < 50)  return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  if (v < 150) return { txt: "ELEVATED", color: "var(--gi-g-high)" };
  return             { txt: "CRITICAL",  color: "var(--gi-g-top)" };
}

export function tempStatus(v: number): GaugeStatus {
  if (v >= 20 && v <= 24) return { txt: "OPTIMAL",  color: "var(--gi-g-low)" };
  if (v >= 18 && v <= 26) return { txt: "NORMAL",   color: "var(--gi-g-low)" };
  if (v >= 16 && v <= 28) return { txt: "MODERATE", color: "var(--gi-g-mid)" };
  return                        { txt: "ELEVATED",  color: "var(--gi-g-high)" };
}

export function humStatus(v: number): GaugeStatus {
  if (v >= 40 && v <= 60) return { txt: "OPTIMAL", color: "var(--gi-g-low)" };
  if (v >= 30 && v <= 70) return { txt: "NORMAL",  color: "var(--gi-g-low)" };
  return                        { txt: "MODERATE", color: "var(--gi-g-mid)" };
}

export function dpStatus(v: number): GaugeStatus {
  if (v < 10) return { txt: "DRY",        color: "var(--gi-g-mid)" };
  if (v < 16) return { txt: "OPTIMAL",    color: "var(--gi-g-low)" };
  if (v < 21) return { txt: "MODERATE",   color: "var(--gi-g-mid)" };
  if (v < 24) return { txt: "HUMID",      color: "var(--gi-g-high)" };
  return             { txt: "OPPRESSIVE", color: "var(--gi-g-top)" };
}

// ─── Derived values ───────────────────────────────────────────────

/** Dew-point approximation (Magnus formula simplified). */
export function dewPoint(temp: number, hum: number): number {
  return temp - (100 - hum) / 5;
}

// ─── Trend helpers ────────────────────────────────────────────────

export type DeltaResult = { text: string; dir: "up" | "down" | "flat" };

/**
 * Compute the delta between the last and the second-to-last value in a trend
 * series. Returns a formatted string and a direction indicator.
 */
export function computeDelta(trend: number[], decimals = 1): DeltaResult {
  if (trend.length < 2) return { text: "—", dir: "flat" };
  const last = trend[trend.length - 1];
  const prev = trend[trend.length - 2];
  const diff = last - prev;
  if (Math.abs(diff) < 0.05) return { text: "±0", dir: "flat" };
  const sign = diff > 0 ? "+" : "";
  const text = `${sign}${Math.abs(diff) >= 100 ? diff.toFixed(0) : diff.toFixed(decimals)}`;
  return { text, dir: diff > 0 ? "up" : "down" };
}

/**
 * Return the previous (second-to-last) value in a trend series, formatted.
 */
export function prevVal(trend: number[], decimals = 1): string {
  if (trend.length < 2) return "—";
  const v = trend[trend.length - 2];
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(decimals);
}
