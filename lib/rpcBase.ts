export function getRpcBaseUrl(): string | undefined {
  const rawBase =
    process.env.NEXT_PUBLIC_NODE_RPC?.trim() ||
    process.env.VITE_NODE_RPC?.trim() ||
    process.env.NEXT_PUBLIC_IPPAN_RPC_URL?.trim() ||
    process.env.IPPAN_RPC_URL?.trim();

  if (!rawBase) return undefined;
  return rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
}

export class RpcError extends Error {
  status: number;
  statusText: string;
  path: string;

  constructor(message: string, opts: { status: number; statusText: string; path: string }) {
    super(message);
    this.name = "RpcError";
    this.status = opts.status;
    this.statusText = opts.statusText;
    this.path = opts.path;
  }
}

export function requireRpcBaseUrl(): string {
  const base = getRpcBaseUrl();
  if (!base) {
    throw new Error("IPPAN Explorer devnet mode: NEXT_PUBLIC_IPPAN_RPC_URL is required");
  }
  return base;
}

export function buildRpcUrl(path: string): string {
  const base = requireRpcBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export async function rpcFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildRpcUrl(path);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) {
    throw new RpcError(`RPC error (${res.status} ${res.statusText}) for ${normalizedPath}`, {
      status: res.status,
      statusText: res.statusText,
      path: normalizedPath
    });
  }
  return (await res.json()) as T;
}

export function getP2pBaseUrl(): string | undefined {
  const rawBase =
    process.env.NEXT_PUBLIC_NODE_P2P?.trim() ||
    process.env.VITE_NODE_P2P?.trim() ||
    process.env.NEXT_PUBLIC_IPPAN_P2P_URL?.trim() ||
    process.env.IPPAN_P2P_URL?.trim();

  if (!rawBase) return undefined;
  return rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
}
