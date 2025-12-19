import { safeJsonFetch } from "./rpc";

/**
 * Deprecated: use `safeJsonFetch` from `lib/rpc` directly.
 */
export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T | null> {
  return safeJsonFetch<T>(path, init);
}
