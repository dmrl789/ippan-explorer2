import { normalizeRpcBase } from "./rpc"; // Re-use normalization helper if valid

// Default DevNet node
export const DEFAULT_DEVNET_RPC = "http://188.245.97.41:8080";

/**
 * Get the canonical RPC base URL for the DevNet.
 * Follows strict precedence rules.
 */
export function getRpcBase(): string {
  // 1. Explicitly configured RPC base
  if (process.env.NEXT_PUBLIC_IPPAN_RPC_BASE) {
    return normalizeRpcBase(process.env.NEXT_PUBLIC_IPPAN_RPC_BASE) || DEFAULT_DEVNET_RPC;
  }

  // 2. Legacy/Alternative RPC URL
  if (process.env.NEXT_PUBLIC_IPPAN_RPC_URL) {
    return normalizeRpcBase(process.env.NEXT_PUBLIC_IPPAN_RPC_URL) || DEFAULT_DEVNET_RPC;
  }

  // 3. Server-side override (non-public)
  if (process.env.IPPAN_RPC_URL) {
    return normalizeRpcBase(process.env.IPPAN_RPC_URL) || DEFAULT_DEVNET_RPC;
  }

  // 4. Fallback to known DevNet
  return DEFAULT_DEVNET_RPC;
}

/**
 * RPC Error class for better error handling
 */
export class DevnetRpcError extends Error {
  status: number;
  url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "DevnetRpcError";
    this.status = status;
    this.url = url;
  }
}

/**
 * Fetch JSON from the DevNet RPC.
 * Automatically handles base URL and error parsing.
 * 
 * @param path - API path (e.g. "/status" or "/tx/recent")
 * @param options - Fetch options
 */
export async function fetchJson<T>(
  path: string, 
  options: RequestInit & { timeout?: number } = {}
): Promise<T> {
  const base = getRpcBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${cleanPath}`;
  
  const { timeout = 10000, ...init } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...init.headers,
      },
    });

    if (!res.ok) {
      throw new DevnetRpcError(
        `RPC request failed: ${res.status} ${res.statusText}`,
        res.status,
        url
      );
    }

    const data = await res.json();
    return data as T;
  } catch (err: unknown) {
    if (err instanceof DevnetRpcError) throw err;
    
    if (err instanceof Error && err.name === "AbortError") {
      throw new DevnetRpcError(`RPC request timed out after ${timeout}ms`, 408, url);
    }

    throw new DevnetRpcError(
      err instanceof Error ? err.message : "Network error",
      0,
      url
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
