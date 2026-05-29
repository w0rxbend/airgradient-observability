export type RangeKey = "1h" | "6h" | "24h" | "7d" | "30d";

export const timeRanges: Array<{ key: RangeKey; label: string }> = [
  { key: "1h", label: "1h" },
  { key: "6h", label: "6h" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];

export function isRangeKey(value: string): value is RangeKey {
  return timeRanges.some((range) => range.key === value);
}

export function isApiRange(value: string): boolean {
  const match = /^(\d+)([hd])$/.exec(value);
  if (!match) return false;

  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isSafeInteger(amount) || amount < 1) return false;

  if (unit === "h") return amount <= 24 * 365;
  return amount <= 365;
}

export function rangeToStep(range: RangeKey): string {
  switch (range) {
    case "1h":
      return "30s";
    case "6h":
      return "2m";
    case "24h":
      return "5m";
    case "7d":
      return "30m";
    case "30d":
      return "2h";
  }
}

export function absoluteStep(ms: number): string {
  const hours = ms / 3_600_000;
  if (hours <= 2) return "30s";
  if (hours <= 12) return "2m";
  if (hours <= 48) return "5m";
  if (hours <= 336) return "30m";
  return "2h";
}
