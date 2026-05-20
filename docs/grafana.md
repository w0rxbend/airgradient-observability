# Grafana

Grafana provides the reference dashboard for the VictoriaMetrics data.

## Provisioning

Datasource:

```text
infra/oci/grafana/datasource.yml
```

Dashboard provider:

```text
infra/oci/grafana/dashboard.yml
```

Dashboard JSON:

```text
dashboards/airgradient-one.json
```

The OCI compose file mounts `dashboards/` into Grafana:

```text
/var/lib/grafana/dashboards
```

## Dashboard Contents

The dashboard includes:

- current CO2
- current PM2.5
- current VOC
- current NOx
- current temperature
- current humidity
- sample age
- scrape health
- last sample time
- air quality history
- gas index history
- comfort history

## Variables

The dashboard has variables for:

- `device`
- `location`

The default device is `airgradient_one`.

## Queries

Core metric names currently match the backend defaults:

```promql
airgradient_co2_ppm
airgradient_pm2d5_ugm3
airgradient_tvoc_index
airgradient_nox_index
airgradient_temperature_degc
airgradient_humidity_percent
```

After the first real scrape, confirm names in VictoriaMetrics:

```promql
{__name__=~"airgradient_.*"}
```

Then update both:

- `dashboards/airgradient-one.json`
- `app/backend/internal/metrics/definitions.go` or `METRIC_*` env vars

## Thresholds

Current threshold defaults:

- CO2: acceptable starts at `801`, critical starts at `1501`
- PM2.5: warning at `5`, critical at `12`
- TVOC index: warning at `100`, critical at `300`
- NOx: warning at `100`, critical at `300`
- humidity: warning at `60`, critical at `70`

Humidity is currently one-directional. A later backend/dashboard pass should model dry air as well as high humidity.
