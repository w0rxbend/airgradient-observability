# Frontend

Frontend implementation is intentionally out of scope for this documentation set.

The repository contains `app/frontend`, and the OCI Compose stack starts a frontend service because Caddy routes `/` to it. For this production documentation pass, treat the frontend as a consumer of the Go backend API only.

Relevant non-frontend contracts:

- backend API: [API Reference](api.md)
- backend behavior: [Backend](backend.md)
- Caddy routing: [Architecture](architecture.md)
- deployment service layout: [Deployment](deployment.md)

## Backend Proxy Configuration

The browser calls same-origin `/api/...` routes. The frontend server proxies those requests to the backend.

Resolution order:

1. `BACKEND_URL`
2. JSON config file from `FRONTEND_CONFIG_FILE`
3. `http://localhost:8081`

JSON config format:

```json
{
  "backendUrl": "http://backend:8080"
}
```

OCI mounts `infra/oci/frontend.config.json` as `/app/config.json`.

Do not use this page as a frontend development guide.
