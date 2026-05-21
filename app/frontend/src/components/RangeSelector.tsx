import { For } from "solid-js";

export type RangeKey = "1h" | "6h" | "24h" | "7d" | "30d";

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "1h", label: "1h" },
  { key: "6h", label: "6h" },
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" }
];

type Props = {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
};

export function RangeSelector(props: Props) {
  return (
    <div class="segmented" role="group" aria-label="Time range">
      <For each={RANGES}>
        {(r) => (
          <button
            type="button"
            class={props.value === r.key ? "active" : ""}
            aria-pressed={props.value === r.key}
            onClick={() => props.onChange(r.key)}
          >
            {r.label}
          </button>
        )}
      </For>
    </div>
  );
}
