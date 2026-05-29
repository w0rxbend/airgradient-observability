# Grafana

Grafana is the primary operator-facing visualization layer for VictoriaMetrics data. It reads VictoriaMetrics directly over the OCI Docker network.

## Provisioning Files

| File | Purpose |
|---|---|
| `infra/oci/grafana/datasource.yml` | provisions the VictoriaMetrics datasource |
| `infra/oci/grafana/dashboard.yml` | provisions dashboards from files |
| `dashboards/airgradient-one.json` | AirGradient dashboard JSON |

Compose mounts:

```text
../../dashboards -> /var/lib/grafana/dashboards:ro
```

The datasource is:

```yaml
name: VictoriaMetrics
uid: VictoriaMetrics
type: prometheus
url: http://victoriametrics:8428
isDefault: true
```

Grafana is configured for sub-path serving:

```env
GF_SERVER_ROOT_URL=https://${DOMAIN}/grafana/
GF_SERVER_SERVE_FROM_SUB_PATH=true
```

## Access

Open:

```text
https://YOUR_DOMAIN/grafana/
```

Caddy Basic Auth protects the route. Grafana may also require its own login depending on Grafana defaults and configuration.

## Dashboard Contents

The AirGradient dashboard is intended to show:

- current CO2
- current PM2.5
- current TVOC index
- current NOx index
- current temperature
- current humidity
- sample age and last sample time
- scrape health
- air-quality history
- gas-index history
- comfort history

## Variables

Dashboard variables:

| Variable | Purpose |
|---|---|
| `device` | selects the static `device` label from `vmagent` scrape config |
| `location` | selects the static `location` label from `vmagent` scrape config |

Default expected labels:

```yaml
device: airgradient_one
location: home
```

If variables are empty, confirm labels exist:

```promql
label_values(airgradient_co2_ppm, device)
label_values(airgradient_co2_ppm{device=~"${device:regex}"}, location)
```

## Core Queries

Metric names should match the backend catalog:

```promql
airgradient_co2_ppm
airgradient_pm2d5_ugm3
airgradient_tvoc_index
airgradient_nox_index
airgradient_temperature_celsius
airgradient_humidity_percent
```

Confirm names after first scrape:

```promql
{__name__=~"airgradient_.*"}
```

If firmware metric names differ, update:

- `dashboards/airgradient-one.json`
- backend `METRIC_*` overrides or `app/backend/internal/metrics/definitions.go`
- [Metrics Catalog](metrics.md)

## Dashboard Change Workflow

Recommended production workflow:

1. edit dashboard in Grafana only for exploration
2. export JSON when the change is accepted
3. commit the updated `dashboards/airgradient-one.json`
4. restart or let Grafana provisioning refresh the dashboard

`allowUiUpdates` is currently `false`, so provisioned dashboards are file-owned. Treat git as the dashboard source of truth.

## Thresholds

Current thresholds:

| Metric | Warning | Critical |
|---|---:|---:|
| CO2 | `801 ppm` | `1501 ppm` |
| PM2.5 | `12 ug/m3` | `35 ug/m3` |
| TVOC index | `100` | `300` |
| NOx index | `100` | `300` |
| humidity | `60%` | `70%` |

Temperature has no status threshold in the backend. Humidity only models high humidity today.

## Operational Checks

Datasource check:

```text
Grafana -> Connections -> Data sources -> VictoriaMetrics -> Save & test
```

Explore query:

```promql
airgradient_co2_ppm
```

Sample freshness query:

```promql
time() - timestamp(airgradient_co2_ppm{device="airgradient_one"})
```

No-data triage:

1. confirm VictoriaMetrics has `airgradient_*` metrics
2. confirm labels match dashboard variables
3. confirm dashboard metric names match firmware output
4. check `vmagent` remote-write logs
5. check Grafana datasource URL is `http://victoriametrics:8428`
