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

// Resolve RPC base URL once, but always as a string
const RPC_BASE_URL: string =
  process.env.NEXT_PUBLIC_IPPAN_RPC ??
  process.env.NEXT_PUBLIC_IPPAN_RPC_FALLBACK ??
  "";

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
  return RPC_BASE_URL;
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
