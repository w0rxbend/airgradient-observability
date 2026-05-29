# Troubleshooting

Use this page from the source outward: device, edge collector, public ingress, VictoriaMetrics, backend, Grafana.

## Quick Triage

1. Can the edge host read the device?

```bash
curl -fsS 'http://airgradient_xxx.local/metrics' | head
```

2. Is `vmagent` running?

```bash
cd infra/edge/vm-agent-airgradient
docker compose -f docker-compose.vmagent.yml ps
docker compose -f docker-compose.vmagent.yml logs --tail=100 vmagent-airgradient
```

3. Is Caddy accepting HTTPS?

```bash
curl -I 'https://YOUR_DOMAIN/api/healthz'
```

4. Does VictoriaMetrics have samples?

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/query?query=airgradient_co2_ppm'
```

5. Does the backend API work?

```bash
curl -u airgradient:'CHANGE_ME' \
  'https://YOUR_DOMAIN/api/metrics/current'
```

## AirGradient `/metrics` Is Unreachable

Symptoms:

- `curl http://airgradient_xxx.local/metrics` fails
- `vmagent` scrape errors mention DNS, connection refused, or timeout

Checks:

```bash
ping airgradient_xxx.local
curl -v 'http://airgradient_xxx.local/metrics'
```

Common causes:

- edge host cannot resolve `.local` mDNS
- device hostname changed
- device is on a different VLAN or WiFi network
- AirGradient firmware is not exposing `/metrics`
- target should be IP-based instead of hostname-based

Fixes:

- use a static DHCP lease and configure `infra/edge/vm-agent-airgradient/prometheus.yml` with IP
- verify sensor and edge host are on the same reachable network
- inspect the AirGradient device configuration

## `vmagent` Is Not Scraping

Check config:

```bash
cd infra/edge/vm-agent-airgradient
docker compose -f docker-compose.vmagent.yml exec vmagent-airgradient \
  cat /etc/vmagent/prometheus.yml
```

Check logs:

```bash
docker compose -f docker-compose.vmagent.yml logs -f vmagent-airgradient
```

Common causes:

- bad YAML indentation
- wrong target hostname
- mDNS failure in container/host environment
- sensor offline

## `remote_write` Fails

Symptoms:

- `vmagent` logs repeated remote-write errors
- VictoriaMetrics has old data only
- edge `vmagentdata` volume grows

Check public route:

```bash
curl -u airgradient:'CHANGE_ME' \
  -I 'https://YOUR_DOMAIN/api/v1/write'
```

Check Caddy logs:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml logs --tail=200 caddy
```

Check VictoriaMetrics logs:

```bash
docker compose -f docker-compose.vm.yml logs --tail=200 victoriametrics
```

Common causes:

- wrong `DOMAIN`
- expired or invalid TLS certificate
- wrong Basic Auth credentials
- `BASIC_AUTH_USER` or `BASIC_AUTH_HASH` missing or mismatched
- firewall not allowing `443/tcp`
- DNS points to the wrong host

## Caddy Fails To Start

Validate mounted files and variables:

```text
infra/oci/Caddyfile
DOMAIN
BASIC_AUTH_USER
BASIC_AUTH_HASH
```

Validate config:

```bash
cd infra/oci
DOMAIN=YOUR_DOMAIN BASIC_AUTH_USER=airgradient BASIC_AUTH_HASH='$2a$14$...' \
docker compose -f docker-compose.vm.yml run --rm caddy caddy validate --config /etc/caddy/Caddyfile
```

Common causes:

- missing `BASIC_AUTH_HASH`
- invalid Caddyfile
- `DOMAIN` not set
- port `80` or `443` already in use on host

## VictoriaMetrics Has No Data

List metric names:

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

If empty:

- confirm `vmagent` can scrape the device
- confirm remote write succeeds
- check Caddy `/api/v1/write` logs
- check VictoriaMetrics container is healthy

If names differ from docs:

- update backend `METRIC_*` overrides
- update Grafana dashboard queries
- update [Metrics Catalog](metrics.md)

## Backend Returns `502`

Example:

```json
{"error":"Post \"http://localhost:8428/api/v1/query\": dial tcp [::1]:8428: connect: connection refused"}
```

Meaning: backend could not query VictoriaMetrics successfully.

Checks:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml ps backend victoriametrics
docker compose -f docker-compose.vm.yml logs --tail=100 backend
docker compose -f docker-compose.vm.yml exec backend wget -qO- 'http://localhost:8080/healthz'
docker compose -f docker-compose.vm.yml exec victoriametrics wget -qO- 'http://localhost:8428/api/v1/query?query=up'
```

Common causes:

- wrong `VM_URL`
- VictoriaMetrics container down
- reverse proxy auth required but `VM_USER`/`VM_PASSWORD` missing
- VictoriaMetrics warning returned by query
- multiple matching series because label filter is too broad

For multi-series errors, inspect labels:

```bash
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/series?match[]=airgradient_co2_ppm'
```

Then narrow:

```env
AIRGRADIENT_LABEL_FILTER={device="airgradient_one",location="home"}
```

## Backend Returns `504`

Meaning: VictoriaMetrics query exceeded `VM_QUERY_TIMEOUT`.

Checks:

- reduce requested `range`
- increase `step`
- confirm VictoriaMetrics CPU/disk health
- increase `VM_QUERY_TIMEOUT` if the query is legitimately expensive

Example:

```bash
VM_QUERY_TIMEOUT=20s go run ./cmd/server
```

## Backend Returns Empty Values

Symptoms:

- API response has `"value": null`
- status is `empty`
- range endpoint returns `points: []`

Checks:

```bash
cd infra/oci
docker compose -f docker-compose.vm.yml exec victoriametrics \
  wget -qO- 'http://localhost:8428/api/v1/query?query=airgradient_co2_ppm%7Bdevice%3D%22airgradient_one%22%7D'
```

Common causes:

- metric name changed
- label filter does not match stored labels
- sensor has not emitted that metric yet
- query time is outside retention or sample availability

## Grafana Dashboard Has No Data

Check datasource:

```text
Grafana -> Connections -> Data sources -> VictoriaMetrics -> Save & test
```

Explore:

```promql
{__name__=~"airgradient_.*"}
```

Check variables:

```promql
label_values(airgradient_co2_ppm, device)
label_values(airgradient_co2_ppm{device=~"${device:regex}"}, location)
```

Common causes:

- datasource URL is wrong
- dashboard metric names do not match firmware
- labels differ from dashboard variable assumptions
- no data has been ingested

## Docker Compose Command Fails

Verify Compose v2:

```bash
docker compose version
```

Render config:

```bash
cd infra/oci
DOMAIN=example.com BASIC_AUTH_USER=airgradient BASIC_AUTH_HASH='$2a$14$...' \
docker compose -f docker-compose.vm.yml config

cd ../edge/vm-agent-airgradient
DOMAIN=example.com VM_USER=user VM_PASSWORD=pass \
docker compose -f docker-compose.vmagent.yml config
```

Common causes:

- old `docker-compose` v1 installed instead of Compose v2
- required variables not set
- running commands from the wrong directory

## Disk Growth

Check Docker disk use:

```bash
docker system df
docker volume ls
```

For VictoriaMetrics:

- confirm retention period
- check OCI disk capacity
- plan snapshots and cleanup

For `vmagentdata`:

- continuous growth usually means remote write is failing
- inspect `vmagent` logs before deleting anything

## Last Resort Restart Order

Restart OCI services:

```bash
cd infra/oci
DOMAIN=YOUR_DOMAIN BASIC_AUTH_USER=airgradient BASIC_AUTH_HASH='$2a$14$...' \
docker compose -f docker-compose.vm.yml restart victoriametrics backend grafana caddy
```

Restart edge collector:

```bash
cd infra/edge/vm-agent-airgradient
DOMAIN=YOUR_DOMAIN VM_USER=airgradient VM_PASSWORD='CHANGE_ME' \
docker compose -f docker-compose.vmagent.yml restart vmagent-airgradient
```

Do not delete Docker volumes unless you intentionally want to remove stored data or retry buffers.
