# Troubleshooting

## Backend Returns 502

Example:

```json
{"error":"Post \"http://localhost:8428/api/v1/query\": dial tcp [::1]:8428: connect: connection refused"}
```

VictoriaMetrics is not reachable from the backend. Check:

- `VM_URL`
- VictoriaMetrics container status
- reverse proxy path if using a remote URL
- Basic Auth credentials if `VM_URL` points through Nginx

## Frontend Shows Empty Gauges

Check backend first:

```bash
curl 'http://localhost:3000/api/metrics/current'
```

If backend works, check the frontend env:

```bash
BACKEND_URL=http://localhost:8080 npm run dev
```

If same-origin production is intended, make sure Nginx proxies `/api/` to the backend.

## Grafana Dashboard Has No Data

Check the datasource:

```text
Grafana -> Connections -> Data sources -> VictoriaMetrics
```

Then query:

```promql
airgradient_co2_ppm
```

If empty, list all AirGradient metrics:

```promql
{__name__=~"airgradient_.*"}
```

If metric names differ, update dashboard queries and backend `METRIC_*` values.

## vmagent Is Not Scraping

Check the device host:

```bash
curl 'http://airgradient_xxx.local/metrics'
```

Check vmagent logs:

```bash
cd infra/edge
docker compose -f docker-compose.vmagent.yml logs -f vmagent
```

Common causes:

- `.local` DNS/mDNS not resolving on the edge host
- wrong AirGradient hostname
- sensor not on the same LAN
- `/metrics` disabled or unavailable

## remote_write Fails

Check the remote write URL:

```text
https://YOUR_DOMAIN/api/v1/write
```

Check:

- TLS certificate validity
- Basic Auth username/password
- Nginx route for `/api/v1/write`
- VictoriaMetrics logs

## Nginx Container Fails To Start

Check mounted files:

```text
infra/oci/certs/fullchain.pem
infra/oci/certs/privkey.pem
infra/oci/.htpasswd
```

Validate the config through Docker:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml run --rm nginx nginx -t
```

## Docker Compose Command Fails

This workspace may not have a compose provider installed. On the target hosts, install Docker Compose v2 and verify:

```bash
docker compose version
```

## Dashboard Variables Are Empty

The dashboard variables use:

```promql
label_values(airgradient_co2_ppm, device)
label_values(airgradient_co2_ppm{device=~"${device:regex}"}, location)
```

If those are empty:

- confirm `airgradient_co2_ppm` exists
- confirm labels are present from `infra/edge/prometheus.yml`
- check whether the real CO2 metric name differs
