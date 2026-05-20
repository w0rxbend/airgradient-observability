# Deployment

Read first:

- [Configuration](configuration.md)
- [Architecture](architecture.md)
- [Security](security.md)
- [Troubleshooting](troubleshooting.md)

## OCI

1. Point `YOUR_DOMAIN` at the OCI VM and use it as `DOMAIN` for Compose.
2. Put TLS certificates under:

```text
infra/oci/certs/fullchain.pem
infra/oci/certs/privkey.pem
```

3. Create an htpasswd file for containerized Nginx:

```bash
cd infra/oci
docker run --rm httpd:2.4-alpine htpasswd -Bbn airgradient 'CHANGE_ME' > .htpasswd
```

4. Start the stack:

```bash
cd infra/oci
DOMAIN=YOUR_DOMAIN docker compose -f docker-compose.vm.yml up -d
```

The stack starts Nginx, VictoriaMetrics, Grafana, the Go backend, and the Solid frontend. Nginx publishes `80` and `443`; the other services stay private inside the Docker network.

Grafana provisions:

- datasource: `infra/oci/grafana/datasource.yml`
- dashboards provider: `infra/oci/grafana/dashboard.yml`
- dashboard JSON files from `dashboards/`

## LAN Edge

1. Replace `airgradient_xxx.local:80` in `infra/edge/prometheus.yml`.
2. Set `DOMAIN=YOUR_DOMAIN` when starting vmagent.
3. Start vmagent:

```bash
cd infra/edge
DOMAIN=YOUR_DOMAIN VM_USER=... VM_PASSWORD=... docker compose -f docker-compose.vmagent.yml up -d
```

## Backend Proxy

```bash
cd app/backend
VM_URL=http://localhost:8428 go run ./cmd/server
```

The backend exposes:

```http
GET /healthz
GET /api/healthz
GET /api/metrics/current
GET /api/metrics/range?metric=co2&range=24h&step=60s
```

It caches current metrics for `CACHE_TTL` and range data for `RANGE_CACHE_TTL`.

## Solid Frontend

```bash
cd app/frontend
npm install
BACKEND_URL=http://localhost:8080 npm run dev
```

The SolidStart dev server proxies same-origin `/api/...` requests to `BACKEND_URL`.

For a remote VictoriaMetrics endpoint protected with Basic Auth, configure the backend:

```bash
VM_URL=https://YOUR_DOMAIN/victoriametrics \
VM_USER=airgradient \
VM_PASSWORD=... \
go run ./cmd/server
```

## Verification

Check whether VictoriaMetrics has samples:

```bash
cd infra/oci
DOMAIN=YOUR_DOMAIN docker compose -f docker-compose.vm.yml exec victoriametrics wget -qO- 'http://localhost:8428/api/v1/query?query=airgradient_co2_ppm'
```

Check the backend API:

```bash
curl -u airgradient:CHANGE_ME 'https://YOUR_DOMAIN/api/metrics/current'
```

If queries are empty, inspect the vmagent logs and verify the exact metric names emitted by the AirGradient firmware.

## Next Production Tasks

- Replace `YOUR_DOMAIN`.
- Configure TLS certificates.
- Create the Basic Auth htpasswd file.
- Confirm real AirGradient metric names.
- Decide backup/snapshot strategy for `vmdata`.
- Pin Docker image versions once the stack is stable.
