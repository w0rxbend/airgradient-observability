import { GaugeCard } from "./GaugeCard";
import { IconAQI } from "./GaugeIcons";
import { aqiGaugeStatus, computeDelta, previousTrendValue } from "../../../shared/domain/airQuality";

type Props = { value: number | null; trend: number[] };

export function GaugeAQI(props: Props) {
  const status = () => aqiGaugeStatus(props.value ?? 0);
  const delta  = () => computeDelta(props.trend, 0);
  const prev   = () => previousTrendValue(props.trend, 0);

  return (
    <GaugeCard
      idx={1}
      label="AQI"
      sublabel="US EPA PM2.5"
      value={props.value}
      max={300}
      unit=""
      statusTxt={status().txt}
      statusColor={status().color}
      prevValue={prev()}
      rangeLabel="EPA SCALE"
      rangeValue="0 – 300"
      deltaText={delta().text}
      deltaDir={delta().dir}
      trend={props.trend}
      icon={<IconAQI color="currentColor" />}
      fmt={(v) => Math.round(v).toString()}
    />
  );
}
