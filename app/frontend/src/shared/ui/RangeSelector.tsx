import { For } from "solid-js";
import { timeRanges, type RangeKey } from "../domain/timeRanges";

export type { RangeKey };

type Props = {
  value: RangeKey;
  onChange: (value: RangeKey) => void;
};

export function RangeSelector(props: Props) {
  return (
    <div class="segmented" role="group" aria-label="Time range">
      <For each={timeRanges}>
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
