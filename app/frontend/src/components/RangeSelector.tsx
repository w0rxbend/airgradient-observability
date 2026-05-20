export type RangeKey = "1h" | "6h" | "24h" | "7d" | "30d";

const ranges: RangeKey[] = ["1h", "6h", "24h", "7d", "30d"];

type RangeSelectorProps = {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
};

export function RangeSelector(props: RangeSelectorProps) {
  return (
    <div class="segmented" aria-label="Time range">
      {ranges.map((range) => (
        <button
          type="button"
          class={props.value === range ? "active" : ""}
          onClick={() => props.onChange(range)}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
