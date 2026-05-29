import { readFile } from "node:fs/promises";

const defaultBackendUrl = "http://localhost:8081";
const defaultConfigPaths = ["/app/config.json", "./config.json"];

type RuntimeConfig = {
  backendUrl?: string;
  backend_url?: string;
};

let cachedBackendUrl: string | undefined;

export async function backendUrl() {
  if (cachedBackendUrl) return cachedBackendUrl;

  const configuredUrl =
    process.env.BACKEND_URL ||
    (await backendUrlFromConfig());

  cachedBackendUrl = normalizeBackendUrl(configuredUrl || defaultBackendUrl);
  return cachedBackendUrl;
}

export async function proxyBackend(path: string) {
  const response = await fetch(`${await backendUrl()}${path}`);
  const contentType = response.headers.get("content-type") || "application/json";
  const body = await response.text();

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": contentType
    }
  });
}

async function backendUrlFromConfig() {
  const configuredPath = process.env.FRONTEND_CONFIG_FILE || process.env.APP_CONFIG_FILE;
  const paths = configuredPath ? [configuredPath] : defaultConfigPaths;

  for (const path of paths) {
    const config = await readConfig(path, Boolean(configuredPath));
    const value = config?.backendUrl || config?.backend_url;
    if (value) return value;
  }
  return undefined;
}

async function readConfig(path: string, required: boolean): Promise<RuntimeConfig | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as RuntimeConfig;
  } catch (error) {
    if (isMissingFile(error) && !required) return undefined;
    throw new Error(`Unable to read frontend config ${path}: ${errorMessage(error)}`);
  }
}

function normalizeBackendUrl(url: string) {
  return url.replace(/\/$/, "");
}

function isMissingFile(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
