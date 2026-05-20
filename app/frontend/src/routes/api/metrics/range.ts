import { proxyBackend } from "../../../lib/serverBackend";

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  return proxyBackend(`/api/metrics/range?${url.searchParams.toString()}`);
}
