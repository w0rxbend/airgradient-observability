import { GaugeCard } from "./GaugeCard";
import { IconDewPoint } from "./GaugeIcons";
import { dpStatus, computeDelta, prevVal } from "../../lib/gauges";

type Props = { value: number | null; trend: number[] };

export function GaugeDewPoint(props: Props) {
  const status = () => dpStatus(props.value ?? 0);
  const delta  = () => computeDelta(props.trend, 1);
  const prev   = () => prevVal(props.trend, 1);

  return (
    <GaugeCard
      idx={8}
      label="DEW POINT"
      sublabel="Moisture in air"
      value={props.value}
      max={30}
      unit=" °C"
      statusTxt={status().txt}
      statusColor={status().color}
      prevValue={prev()}
      rangeLabel="COMFORT"
      rangeValue="10–16 °C"
      deltaText={delta().text}
      deltaDir={delta().dir}
      trend={props.trend}
      icon={<IconDewPoint color="currentColor" />}
    />
  );
}
