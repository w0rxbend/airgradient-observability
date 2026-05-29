import { proxyBackend } from "../../shared/api/serverBackendGateway";

export async function GET() {
  return proxyBackend("/api/healthz");
}
