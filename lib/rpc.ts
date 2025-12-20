function normalizeRpcBase(rawBase?: string): string | undefined {
  if (!rawBase) return undefined;
  const trimmed = rawBase.trim();
  if (!trimmed) return undefined;
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}

export const DEFAULT_RPC_BASE = "http://188.245.97.41:8080"; // fallback DevNet node

function getRpcBaseFromEnv(): string | undefined {
  const rawBase =
    process.env.NEXT_PUBLIC_IPPAN_RPC_BASE ??
    process.env.NEXT_PUBLIC_NODE_RPC ??
    process.env.NEXT_PUBLIC_IPPAN_RPC_URL ??
    process.env.NEXT_PUBLIC_IPPAN_RPC ??
    process.env.NEXT_PUBLIC_IPPAN_RPC_FALLBACK ??
    process.env.NEXT_PUBLIC_RPC_URL ??
    process.env.NEXT_PUBLIC_EXPLORER_API ??
    process.env.VITE_NODE_RPC ??
    process.env.IPPAN_RPC_URL ??
    process.env.IPPAN_RPC_BASE;

  return normalizeRpcBase(rawBase);
}

function getRpcBase(): string {
  const env = getRpcBaseFromEnv();
  if (!env) {
    // Log in dev, but do NOT crash the app
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("RPC base URL missing, using fallback:", DEFAULT_RPC_BASE);
    }
    return DEFAULT_RPC_BASE;
  }
  return env;
}

/**
 * Resolved RPC base URL used across the explorer.
 * This is always a non-empty string (falls back to a known DevNet node).
 */
export const IPPAN_RPC_BASE = getRpcBase();

export function getEnvRpcBaseUrl(): string | undefined {
  return getRpcBaseFromEnv();
}

/**
 * Default canonical DevNet nodes (Nuremberg, Helsinki, Singapore, Ashburn).
 */
const DEFAULT_DEVNET_NODES =
  "http://188.245.97.41:8080," +
  "http://135.181.145.174:8080," +
  "http://5.223.51.238:8080," +
  "http://178.156.219.107:8080";

const RAW_DEVNET = process.env.NEXT_PUBLIC_IPPAN_DEVNET_NODES ?? DEFAULT_DEVNET_NODES;

/**
 * List of DevNet node URLs for multi-node status checks.
 */
export const DEVNET_NODES: string[] = RAW_DEVNET.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const RPC_BASE_URL = IPPAN_RPC_BASE;

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

async function safeJsonFetchWithStatusInternal<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number | null; data: T | null; url: string }> {
  const base = requireRpcBaseUrl().replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    if (!res.ok) {
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.error(`RPC error ${res.status} for ${url}`);
      }
      return { status: res.status, data: null, url };
    }

    try {
      return { status: res.status, data: (await res.json()) as T, url };
    } catch (err) {
      if (typeof window !== "undefined") {
        // eslint-disable-next-line no-console
        console.error("RPC JSON parse failed for", url, err);
      }
      return { status: res.status, data: null, url };
    }
  } catch (err) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("RPC fetch failed for", url, err);
    }
    return { status: null, data: null, url };
  } finally {
    clearTimeout(timeout);
  }
}

export async function safeJsonFetchWithStatus<T>(
  path: string,
  init?: RequestInit,
): Promise<{ status: number | null; data: T | null }> {
  const { status, data } = await safeJsonFetchWithStatusInternal<T>(path, init);
  return { status, data };
}

export async function safeJsonFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  const { data } = await safeJsonFetchWithStatusInternal<T>(path, init);
  return data;
}

/**
 * Strict fetch helper that throws on RPC failures (kept for back-compat).
 * Prefer `safeJsonFetch`/`safeJsonFetchWithStatus` for UI stability.
 */
export async function rpcFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const base = requireRpcBaseUrl();
  const { status, data } = await safeJsonFetchWithStatusInternal<T>(normalizedPath, init);

  if (data === null) {
    const code = status ?? 0;
    const statusText = status === null ? "FETCH_FAILED" : "ERROR";
    throw new RpcError(`RPC error ${code} ${statusText} for ${normalizedPath} (base=${base})`, {
      status: code,
      statusText,
      path: normalizedPath,
      base,
    });
  }

  return data;
}
