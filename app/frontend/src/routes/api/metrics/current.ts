import { proxyBackend } from "../../../lib/serverBackend";

export async function GET() {
  return proxyBackend("/api/metrics/current");
}
