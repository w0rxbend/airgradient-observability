import { GaugeCard } from "./GaugeCard";
import { IconHum } from "./GaugeIcons";
import { humStatus, computeDelta, prevVal } from "../../lib/gauges";

type Props = { value: number | null; trend: number[] };

export function GaugeHum(props: Props) {
  const status = () => humStatus(props.value ?? 0);
  const delta  = () => computeDelta(props.trend, 1);
  const prev   = () => prevVal(props.trend, 1);

  return (
    <GaugeCard
      idx={7}
      label="HUMIDITY"
      sublabel="Relative humidity"
      value={props.value}
      max={100}
      unit=" %"
      statusTxt={status().txt}
      statusColor={status().color}
      prevValue={prev()}
      rangeLabel="COMFORT"
      rangeValue="40–60 %"
      deltaText={delta().text}
      deltaDir={delta().dir}
      trend={props.trend}
      icon={<IconHum color="currentColor" />}
    />
  );
}
