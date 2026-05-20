# Configuration

Configuration is intentionally split by runtime context. Avoid using one global `.env` file for every service unless the variable names and secrets are intentionally shared.

## Edge vmagent

Used from `infra/edge/docker-compose.vmagent.yml`.

```env
VM_USER=airgradient
VM_PASSWORD=change-me
```

Important files:

- `infra/edge/prometheus.yml`
- `infra/edge/docker-compose.vmagent.yml`

Change these before running:

- `airgradient_xxx.local:80`
- `https://YOUR_DOMAIN/api/v1/write`
  The compose file now uses `DOMAIN`, so set `DOMAIN=YOUR_DOMAIN` when starting vmagent.

## OCI Compose

Used from `infra/oci/docker-compose.vm.yml`.

The compose stack starts:

- `victoriametrics`
- `grafana`
- `backend`
- `frontend`
- `nginx`

Only Nginx publishes host ports:

- Nginx: `80`, `443`
- VictoriaMetrics: `8428` inside the Docker network
- Grafana: `3000` inside the Docker network
- Go backend: `8080` inside the Docker network
- Solid frontend: `3000` inside the Docker network

## Go Backend

Used by `app/backend`.

```env
ADDR=:8080
VM_URL=http://localhost:8428
VM_USER=
VM_PASSWORD=
AIRGRADIENT_LABEL_FILTER={device="airgradient_one"}
CACHE_TTL=10s
RANGE_CACHE_TTL=30s
VM_QUERY_TIMEOUT=10s
ALLOWED_ORIGIN=http://localhost:3000
```

Metric names can be overridden without recompiling:

```env
METRIC_CO2=airgradient_co2_ppm
METRIC_PM25=airgradient_pm2d5_ugm3
METRIC_VOC=airgradient_tvoc_index
METRIC_NOX=airgradient_nox_index
METRIC_TEMPERATURE=airgradient_temperature_degc
METRIC_HUMIDITY=airgradient_humidity_percent
```

`METRIC_*` values are intended to be simple metric names. If you set a full PromQL expression, the backend will not append `AIRGRADIENT_LABEL_FILTER` to it.

The root `.env.example` shows all variables in one place for discovery. In practice, keep edge, backend, and frontend env files separate so similarly named secrets do not get mixed accidentally.

## Solid Frontend

Used by `app/frontend` on the SolidStart server side.

```env
BACKEND_URL=http://localhost:8080
```

Browser code calls same-origin `/api/...`; it does not receive `BACKEND_URL`.

## Reverse Proxy

`infra/oci/nginx.conf` separates ingestion traffic from app traffic:

- `/api/v1/write` -> VictoriaMetrics remote write
- `/api/` -> Go backend
- `/grafana/` -> Grafana
- `/victoriametrics/` -> VictoriaMetrics query/debug path

Keep Basic Auth and TLS in front of public endpoints.

The Nginx container expects these files under `infra/oci`:

```text
certs/fullchain.pem
certs/privkey.pem
.htpasswd
```
