import { GaugeCard } from "./GaugeCard";
import { IconTemp } from "./GaugeIcons";
import { temperatureGaugeStatus, computeDelta, previousTrendValue } from "../../../shared/domain/airQuality";

type Props = { value: number | null; trend: number[] };

export function GaugeTemp(props: Props) {
  const status = () => temperatureGaugeStatus(props.value ?? 0);
  const delta  = () => computeDelta(props.trend, 1);
  const prev   = () => previousTrendValue(props.trend, 1);

  // Scale: 10–35 °C so that 22°C (ideal) sits near 48% of the arc.
  return (
    <GaugeCard
      idx={4}
      label="TEMP"
      sublabel="Air temperature"
      value={props.value}
      min={10}
      max={35}
      unit=" °C"
      statusTxt={status().txt}
      statusColor={status().color}
      prevValue={prev()}
      rangeLabel="COMFORT"
      rangeValue="20–24 °C"
      deltaText={delta().text}
      deltaDir={delta().dir}
      trend={props.trend}
      icon={<IconTemp color="currentColor" />}
    />
  );
}
