import { GaugeCard } from "./GaugeCard";
import { IconCO2 } from "./GaugeIcons";
import { co2GaugeStatus, computeDelta, previousTrendValue } from "../../../shared/domain/airQuality";

type Props = { value: number | null; trend: number[] };

export function GaugeCO2(props: Props) {
  const status = () => co2GaugeStatus(props.value ?? 0);
  const delta  = () => computeDelta(props.trend, 0);
  const prev   = () => previousTrendValue(props.trend, 0);

  return (
    <GaugeCard
      idx={3}
      label="CO₂"
      sublabel="Carbon dioxide"
      value={props.value}
      max={2000}
      unit=" ppm"
      statusTxt={status().txt}
      statusColor={status().color}
      prevValue={prev()}
      rangeLabel="ASHRAE"
      rangeValue="< 800 ppm"
      deltaText={delta().text}
      deltaDir={delta().dir}
      trend={props.trend}
      icon={<IconCO2 color="currentColor" />}
      fmt={(v) => Math.round(v).toString()}
    />
  );
}
