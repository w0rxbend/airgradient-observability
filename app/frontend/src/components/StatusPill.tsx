import type { Status } from "../lib/thresholds";
import { statusLabel } from "../lib/thresholds";

type Props = {
  status: Status;
  label?: string;
};

export function StatusPill(props: Props) {
  const text = () => props.label ?? statusLabel(props.status);
  return (
    <span
      class={`status-pill ${props.status}`}
      role="status"
      aria-label={`Status: ${text()}`}
    >
      {text()}
    </span>
  );
}
