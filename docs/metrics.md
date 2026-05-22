# Metrics Catalog

AirGradient ONE exposes Prometheus-compatible metrics at:

```text
http://airgradient_xxx.local/metrics
```

`vmagent` scrapes that endpoint, adds static labels, and remote-writes samples into VictoriaMetrics. The backend then maps selected raw metric names to stable API keys.

## Backend Metrics

The backend currently exposes six normalized metrics:

| API key | VictoriaMetrics metric | Unit | Source meaning |
|---|---|---|---|
| `co2` | `airgradient_co2_ppm` | `ppm` | carbon dioxide from the AirGradient S8 sensor |
| `pm25` | `airgradient_pm2d5_ugm3` | `ug/m3` | PM2.5 concentration from the PMS sensor |
| `voc` | `airgradient_tvoc_index` | `index` | processed TVOC index from SGP sensor |
| `nox` | `airgradient_nox_index` | `index` | processed NOx index from SGP sensor |
| `temperature` | `airgradient_temperature_celsius` | `C` | ambient temperature |
| `humidity` | `airgradient_humidity_percent` | `%` | relative humidity |

These defaults match the checked sample in `app/backend/metrics`.

## Additional Scraped Metrics

The sample scrape also includes metrics that are stored in VictoriaMetrics but not exposed by the backend API today:

| Metric | Meaning |
|---|---|
| `airgradient_info` | device serial, type, library version as labels |
| `airgradient_config_ok` | device configuration fetch status |
| `airgradient_post_ok` | device post status |
| `airgradient_wifi_rssi_dbm` | WiFi signal strength |
| `airgradient_pm1_ugm3` | PM1.0 concentration |
| `airgradient_pm10_ugm3` | PM10 concentration |
| `airgradient_pm0d3_p100ml` | PM0.3 particle count per 100 ml |
| `airgradient_tvoc_raw` | raw TVOC sensor input |
| `airgradient_nox_raw` | raw NOx sensor input |
| `airgradient_temperature_compensated_celsius` | compensated temperature |
| `airgradient_humidity_compensated_percent` | compensated humidity |

To expose any of these through the backend, add a new metric key in `app/backend/internal/metrics/definitions.go`, extend API consumers, and update Grafana if needed.

## Labels

`infra/edge/prometheus.yml` adds:

```yaml
labels:
  location: home
  device: airgradient_one
```

The backend appends the configured label filter to bare metric names:

```env
AIRGRADIENT_LABEL_FILTER={device="airgradient_one"}
```

Effective query:

```promql
airgradient_co2_ppm{device="airgradient_one"}
```

## Validate Metrics In VictoriaMetrics

List names:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/label/__name__/values'
```

Query all AirGradient series:

```bash
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/series?match[]={__name__=~"airgradient_.*"}'
```

Check one metric:

```bash
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/query?query=airgradient_co2_ppm'
```

In Grafana Explore:

```promql
{__name__=~"airgradient_.*"}
```

## If Names Differ

Firmware or exporter changes may rename metrics. When that happens:

1. Confirm real names using VictoriaMetrics label queries.
2. Prefer backend environment overrides:

```env
METRIC_CO2=actual_co2_metric_name
METRIC_PM25=actual_pm25_metric_name
METRIC_VOC=actual_voc_metric_name
METRIC_NOX=actual_nox_metric_name
METRIC_TEMPERATURE=actual_temperature_metric_name
METRIC_HUMIDITY=actual_humidity_metric_name
```

3. Update `dashboards/airgradient-one.json` queries.
4. Update this catalog if the change is permanent.

## Thresholds

Current backend thresholds:

| API key | `goodBelow` | `warnBelow` | Result |
|---|---:|---:|---|
| `co2` | `801` | `1501` | high CO2 worsens status |
| `pm25` | `12` | `35` | high PM2.5 worsens status |
| `voc` | `100` | `300` | high VOC index worsens status |
| `nox` | `100` | `300` | high NOx index worsens status |
| `temperature` | none | none | no threshold status |
| `humidity` | `60` | `70` | high humidity worsens status |

Status rules:

- `value == null`: `empty`
- `value >= warnBelow`: `critical`
- `value >= goodBelow`: `warning`
- otherwise: `good`

## Notes

- NOx and TVOC are index values, not absolute pollutant concentrations.
- PM units use `ug/m3` in API JSON for ASCII compatibility, while Prometheus HELP text describes micrograms per cubic meter.
- The backend expects one series per metric after label filtering. Multiple series currently produce an error instead of aggregation.
