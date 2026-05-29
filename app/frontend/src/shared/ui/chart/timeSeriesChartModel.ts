import type { RangePoint } from "../../api/backendClient";

export const chartGeometry = {
  width: 900,
  height: 280,
  padLeft: 52,
  padRight: 16,
  padTop: 16,
  padBottom: 36,
  yTicks: 5,
  xTicks: 6,
  histogramBins: 16,
};

export type TimeSeriesDomain = {
  minX: number;
  maxX: number;
  min: number;
  max: number;
};

export type HistogramBin = {
  lo: number;
  hi: number;
  count: number;
};

export function getDomain(points: RangePoint[]): TimeSeriesDomain {
  if (points.length === 0) return { minX: 0, maxX: 1, min: 0, max: 1 };
  const xs = points.map(([timestamp]) => timestamp);
  const ys = points.map(([, value]) => value);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const pad = (max - min || 1) * 0.1;
  return { minX: Math.min(...xs), maxX: Math.max(...xs), min: min - pad, max: max + pad };
}

export function buildHistogramBins(points: RangePoint[], binCount = chartGeometry.histogramBins) {
  if (points.length === 0) return [];
  const values = points.map(([, value]) => value);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const binWidth = (hi - lo || 1) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, index) => ({
    lo: lo + index * binWidth,
    hi: lo + (index + 1) * binWidth,
    count: 0,
  }));

  for (const value of values) {
    const index = Math.min(binCount - 1, Math.floor((value - lo) / binWidth));
    bins[index].count++;
  }

  return bins;
}

export function formatTick(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

export function formatChartValue(value: number): string {
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  if (Math.abs(value) >= 100) return value.toFixed(0);
  return value.toFixed(1);
}

export function formatChartTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() !== now.toDateString()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatChartTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
