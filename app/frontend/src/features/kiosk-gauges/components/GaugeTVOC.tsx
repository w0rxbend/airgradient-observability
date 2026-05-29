import { GaugeCard } from "./GaugeCard";
import { IconTVOC } from "./GaugeIcons";
import { vocGaugeStatus, computeDelta, previousTrendValue } from "../../../shared/domain/airQuality";

type Props = { value: number | null; trend: number[] };

export function GaugeTVOC(props: Props) {
  const status = () => vocGaugeStatus(props.value ?? 0);
  const delta  = () => computeDelta(props.trend, 0);
  const prev   = () => previousTrendValue(props.trend, 0);

  return (
    <GaugeCard
      idx={5}
      label="TVOC"
      sublabel="Volatile organics"
      value={props.value}
      max={500}
      unit=" idx"
      statusTxt={status().txt}
      statusColor={status().color}
      prevValue={prev()}
      rangeLabel="SAFE"
      rangeValue="< 150 idx"
      deltaText={delta().text}
      deltaDir={delta().dir}
      trend={props.trend}
      icon={<IconTVOC color="currentColor" />}
      fmt={(v) => Math.round(v).toString()}
    />
  );
}
