import { proxyBackend } from "../../../lib/serverBackend";
import {
  validateAbsoluteRangeRequest,
  validationErrorResponse,
} from "../../../shared/api/routeValidation";

export async function GET({ request }: { request: Request }) {
  const url = new URL(request.url);
  const validation = validateAbsoluteRangeRequest(url.searchParams);
  if (!validation.ok) return validationErrorResponse(validation.error);
  return proxyBackend(validation.path);
}
