import { proxyBackend } from "../../lib/serverBackend";

export async function GET() {
  return proxyBackend("/api/healthz");
}
