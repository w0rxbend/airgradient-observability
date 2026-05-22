# Security

## Security Model

The stack is designed for a small self-hosted deployment with a private LAN sensor and a public OCI endpoint. The primary goals are:

- never expose VictoriaMetrics port `8428` directly to the internet
- require HTTPS for all public traffic
- require authentication for remote write, Grafana, backend API, and any direct VictoriaMetrics route
- keep VictoriaMetrics credentials out of browser-visible code
- preserve a clear boundary between collector, storage, dashboard, and API consumers

## Public Endpoint Inventory

Expected public ingress is Nginx on:

- `80/tcp`: HTTP redirect or certificate challenge flow
- `443/tcp`: HTTPS application and ingestion traffic

Current public paths:

| Path | Auth | Purpose |
|---|---|---|
| `/api/v1/write` | Basic Auth | `vmagent` remote write |
| `/api/` | Basic Auth | Go backend API |
| `/grafana/` | Basic Auth plus Grafana auth if enabled | dashboard UI |
| `/victoriametrics/` | Basic Auth | direct VictoriaMetrics query/debug access |
| `/` | Basic Auth | frontend service route |

The `/victoriametrics/` route is convenient during setup. For stricter production posture, remove it or restrict it by source IP/VPN.

## Private Services

These should remain private to the Docker network:

| Service | Internal address |
|---|---|
| VictoriaMetrics | `victoriametrics:8428` |
| Grafana | `grafana:3000` |
| backend | `backend:8080` |
| frontend service | `frontend:3000` |

Do not add host `ports:` mappings for those services unless you intentionally change the threat model.

## Authentication

The current deployment uses one Nginx Basic Auth file:

```text
infra/oci/.htpasswd
```

This is simple and adequate for initial self-hosting. Production improvements:

- use separate credentials for remote-write and human users
- restrict `/api/v1/write` to the edge host IP if it is stable
- move human access behind VPN, SSO, or a stronger reverse proxy auth layer
- remove direct VictoriaMetrics route from public routing

## TLS

Nginx expects:

```text
infra/oci/certs/fullchain.pem
infra/oci/certs/privkey.pem
```

Operational requirements:

- automate or calendar certificate renewal
- restart Nginx after replacing cert files
- monitor certificate expiration
- use modern TLS defaults from the base Nginx image or provide a hardened config if exposed broadly

## Secrets

Do not commit:

- `.htpasswd`
- private keys
- real production `.env` files
- Grafana admin passwords
- Basic Auth passwords

The `.env.example` file is a reference only.

Credential boundaries:

- edge remote-write credential authorizes writes into VictoriaMetrics
- backend VictoriaMetrics credential is only needed when querying through an authenticated reverse proxy
- human Grafana/API credentials authorize reads and dashboard access

Use separate credentials when the deployment grows beyond a single trusted operator.

## CORS

The backend allows one configured origin:

```env
ALLOWED_ORIGIN=http://localhost:3000
```

Production Compose sets it to:

```env
ALLOWED_ORIGIN=https://${DOMAIN}
```

Because public production traffic goes through same-origin Nginx routes, CORS should not be the primary security boundary. Treat it as browser hygiene, not access control.

## VictoriaMetrics Exposure

VictoriaMetrics can ingest, query, and delete or inspect data through its HTTP API depending on flags and endpoints. Keep direct access internal unless there is a deliberate operational reason.

Recommended hardening:

- remove `/victoriametrics/` from Nginx after setup
- keep only `/api/v1/write` publicly routed for ingestion
- query VictoriaMetrics from Grafana and backend over the Docker network
- use firewall rules or VPN for debug access

## Supply Chain

Current images include floating tags for rapid iteration:

- `victoriametrics/victoria-metrics:latest`
- `victoriametrics/vmagent:latest`
- `grafana/grafana:latest`

Before production:

- pin image tags
- review release notes before upgrades
- record image versions in operational notes
- rebuild backend images from known source commits

## Data Sensitivity

Air-quality data can reveal occupancy patterns, ventilation habits, and home activity schedules. Treat the data as private telemetry.

Protect:

- Grafana dashboard access
- raw VictoriaMetrics queries
- backend range endpoints
- backups and snapshots

## Security Checklist

- [ ] only `80` and `443` are open publicly
- [ ] VictoriaMetrics `8428` is not public
- [ ] TLS certificate is valid
- [ ] `.htpasswd` exists and uses strong credentials
- [ ] `.htpasswd`, cert private keys, and real env files are not committed
- [ ] `/victoriametrics/` is removed or intentionally protected
- [ ] Docker image versions are pinned for production
- [ ] backups are encrypted or access-controlled
- [ ] credential rotation procedure has been tested
