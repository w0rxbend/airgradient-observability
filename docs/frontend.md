# Frontend

Frontend implementation is intentionally out of scope for this documentation set.

The repository contains `app/frontend`, and the OCI Compose stack starts a frontend service because Nginx routes `/` to it. For this production documentation pass, treat the frontend as a consumer of the Go backend API only.

Relevant non-frontend contracts:

- backend API: [API Reference](api.md)
- backend behavior: [Backend](backend.md)
- Nginx routing: [Architecture](architecture.md)
- deployment service layout: [Deployment](deployment.md)

Do not use this page as a frontend development guide.
