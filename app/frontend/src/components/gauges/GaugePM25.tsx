import { GaugeCard } from "./GaugeCard";
import { IconPM25 } from "./GaugeIcons";
import { pm25Status, computeDelta, prevVal } from "../../lib/gauges";

type Props = { value: number | null; trend: number[] };

export function GaugePM25(props: Props) {
  const status = () => pm25Status(props.value ?? 0);
  const delta  = () => computeDelta(props.trend, 1);
  const prev   = () => prevVal(props.trend, 1);

  return (
    <GaugeCard
      idx={2}
      label="PM2.5"
      sublabel="Fine particles 2.5 µm"
      value={props.value}
      max={75}
      unit=" µg/m³"
      statusTxt={status().txt}
      statusColor={status().color}
      prevValue={prev()}
      rangeLabel="WHO 24H"
      rangeValue="15 µg/m³"
      deltaText={delta().text}
      deltaDir={delta().dir}
      trend={props.trend}
      icon={<IconPM25 color="currentColor" />}
    />
  );
}
