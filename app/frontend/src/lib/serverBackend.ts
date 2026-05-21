const defaultBackendUrl = "http://localhost:8081";

export function backendUrl() {
  return (process.env.BACKEND_URL || defaultBackendUrl).replace(/\/$/, "");
}

export async function proxyBackend(path: string) {
  const response = await fetch(`${backendUrl()}${path}`);
  const contentType = response.headers.get("content-type") || "application/json";
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": contentType
    }
  });
}
