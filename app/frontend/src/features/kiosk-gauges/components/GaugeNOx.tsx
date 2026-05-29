import { GaugeCard } from "./GaugeCard";
import { IconNOx } from "./GaugeIcons";
import { noxGaugeStatus, computeDelta, previousTrendValue } from "../../../shared/domain/airQuality";

type Props = { value: number | null; trend: number[] };

export function GaugeNOx(props: Props) {
  const status = () => noxGaugeStatus(props.value ?? 0);
  const delta  = () => computeDelta(props.trend, 0);
  const prev   = () => previousTrendValue(props.trend, 0);

  return (
    <GaugeCard
      idx={6}
      label="NOx"
      sublabel="Nitrogen oxides"
      value={props.value}
      max={500}
      unit=" idx"
      statusTxt={status().txt}
      statusColor={status().color}
      prevValue={prev()}
      rangeLabel="BASELINE"
      rangeValue="1 = clean"
      deltaText={delta().text}
      deltaDir={delta().dir}
      trend={props.trend}
      icon={<IconNOx color="currentColor" />}
      fmt={(v) => Math.round(v).toString()}
    />
  );
}
