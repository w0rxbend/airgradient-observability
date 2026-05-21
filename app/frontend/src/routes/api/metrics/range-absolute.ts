import { proxyBackend } from "../../../lib/serverBackend";

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  return proxyBackend(`/api/metrics/range-absolute?${url.searchParams.toString()}`);
}
