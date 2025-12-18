function normalizeRpcBase(rawBase?: string): string | undefined {
  if (!rawBase) return undefined;
  const trimmed = rawBase.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export function getEnvRpcBaseUrl(): string | undefined {
  const rawBase =
    process.env.NEXT_PUBLIC_IPPAN_RPC ??
    process.env.NEXT_PUBLIC_IPPAN_RPC_FALLBACK ??
    process.env.NEXT_PUBLIC_IPPAN_RPC_URL ??
    process.env.IPPAN_RPC_URL ??
    process.env.IPPAN_RPC_BASE;

  return normalizeRpcBase(rawBase);
}

const RPC_BASE_URL = getEnvRpcBaseUrl() ?? "";

export class RpcError extends Error {
  status: number;
  statusText: string;
  path: string;
  base: string;

  constructor(message: string, opts: { status: number; statusText: string; path: string; base: string }) {
    super(message);
    this.name = "RpcError";
    this.status = opts.status;
    this.statusText = opts.statusText;
    this.path = opts.path;
    this.base = opts.base;
  }
}

export function requireRpcBaseUrl(): string {
  if (RPC_BASE_URL) {
    return RPC_BASE_URL;
  }

  const fallback =
    normalizeRpcBase(process.env.NEXT_PUBLIC_IPPAN_RPC_FALLBACK) ??
    normalizeRpcBase(process.env.NEXT_PUBLIC_IPPAN_RPC) ??
    normalizeRpcBase(process.env.NEXT_PUBLIC_IPPAN_RPC_URL) ??
    normalizeRpcBase(process.env.IPPAN_RPC_URL) ??
    normalizeRpcBase(process.env.IPPAN_RPC_BASE) ??
    "";

  if (!fallback) {
    // Important: do NOT throw here, or Vercel build will fail when RPC is not configured.
    // Returning an empty string lets the UI handle "no live data" gracefully.
    // eslint-disable-next-line no-console
    console.warn("⚠️ No IPPAN RPC base URL defined – live devnet data disabled.");
    return "";
  }

  return fallback;
}

export function buildRpcUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = requireRpcBaseUrl();
  return `${base}${normalizedPath}`;
}

export async function rpcFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = requireRpcBaseUrl();
  const url = `${base}${normalizedPath}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new RpcError(`RPC error ${res.status} ${res.statusText} for ${normalizedPath} (base=${base})`, {
        status: res.status,
        statusText: res.statusText,
        path: normalizedPath,
        base,
      });
    }

    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}
