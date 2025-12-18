const RAW_RPC_BASE_URL = process.env.NEXT_PUBLIC_IPPAN_RPC_URL?.trim();

if (!RAW_RPC_BASE_URL) {
  // Build-time failure for server components / API routes
  throw new Error("IPPAN Explorer devnet mode: NEXT_PUBLIC_IPPAN_RPC_URL must be set");
}

const RPC_BASE_URL = RAW_RPC_BASE_URL.endsWith("/") ? RAW_RPC_BASE_URL.slice(0, -1) : RAW_RPC_BASE_URL;

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
  return `${RPC_BASE_URL}${normalizedPath}`;
}

export async function rpcFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${RPC_BASE_URL}${normalizedPath}`;

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
      throw new RpcError(`RPC error ${res.status} ${res.statusText} for ${normalizedPath} (base=${RPC_BASE_URL})`, {
        status: res.status,
        statusText: res.statusText,
        path: normalizedPath,
        base: RPC_BASE_URL,
      });
    }

    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}
