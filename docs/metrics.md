# Metrics Catalog

The project assumes the AirGradient ONE exposes Prometheus-compatible metrics at:

```text
http://airgradient_xxx.local/metrics
```

The exact metric names can vary by firmware or exporter. The names below are current defaults.

| Key | Default query | Unit | Notes |
|---|---|---|---|
| `co2` | `airgradient_co2_ppm` | `ppm` | Main ventilation signal |
| `pm25` | `airgradient_pm2d5_ugm3` | `ug/m3` | Fine particulate matter |
| `voc` | `airgradient_tvoc_index` | `index` | VOC index from SGP41 |
| `nox` | `airgradient_nox_index` | `index` | NOx index from SGP41 |
| `temperature` | `airgradient_temperature_degc` | `C` | Ambient temperature |
| `humidity` | `airgradient_humidity_percent` | `%` | Relative humidity |

## Labels

`infra/edge/prometheus.yml` adds:

```yaml
labels:
  location: home
  device: airgradient_one
```

The backend appends `AIRGRADIENT_LABEL_FILTER` to simple metric queries:

```env
AIRGRADIENT_LABEL_FILTER={device="airgradient_one"}
```

## Confirm Real Samples

Once vmagent is writing into VictoriaMetrics:

```bash
docker compose -f infra/oci/docker-compose.vm.yml exec victoriametrics wget -qO- 'http://localhost:8428/api/v1/label/__name__/values'
```

Or in Grafana/VictoriaMetrics:

```promql
{__name__=~"airgradient_.*"}
```

## If Names Differ

Prefer environment overrides for the backend:

```env
METRIC_CO2=actual_co2_metric_name
METRIC_PM25=actual_pm25_metric_name
```

Then update Grafana dashboard queries to match.
