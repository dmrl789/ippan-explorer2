/**
 * Simple client-side fetch helper for RPC proxy.
 * 
 * Handles BOTH response formats:
 * 1. Envelope: { ok, data: {...} }
 * 2. Plain: { ok, blocks: [...] }
 */

export type FetchResult<T> =
  | { ok: true; data: T; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

/**
 * Unwrap response - handles both envelope and plain formats.
 */
function unwrap<T>(json: unknown): { ok: boolean; data: T | null; raw: unknown } {
  if (!json || typeof json !== "object") {
    return { ok: false, data: null, raw: json };
  }

  const obj = json as Record<string, unknown>;

  // Check if request failed
  if (obj.ok === false) {
    return { ok: false, data: null, raw: json };
  }

  // Envelope format: { ok, data: {...} } → extract data
  if ("data" in obj && obj.data !== undefined) {
    return { ok: true, data: obj.data as T, raw: json };
  }

  // Plain format: { ok, blocks: [...] } → return entire object
  return { ok: true, data: json as T, raw: json };
}

/**
 * Fetch from the RPC proxy with automatic unwrapping.
 * Always uses /api/rpc/* (same-origin proxy).
 */
export async function fetchProxy<T>(path: string): Promise<FetchResult<T>> {
  const url = `/api/rpc${path.startsWith("/") ? path : `/${path}`}`;
  
  try {
    const res = await fetch(url, { cache: "no-store" });
    
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false, error: `HTTP ${res.status}: Invalid JSON`, raw: null };
    }

    const u = unwrap<T>(json);

    if (!res.ok || !u.ok || u.data === null) {
      const errObj = json as Record<string, unknown>;
      const errMsg = (errObj?.detail as string) || (errObj?.error as string) || `HTTP ${res.status}`;
      return { ok: false, error: errMsg, raw: u.raw };
    }

    return { ok: true, data: u.data, raw: u.raw };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

/**
 * Convert timestamp to milliseconds.
 * DevNet timestamps may be in microseconds (~1e15).
 */
export function toMs(ts: number | undefined | null): number | null {
  if (ts === undefined || ts === null || isNaN(ts)) return null;
  // Microseconds are > 50 trillion
  if (ts > 50_000_000_000_000) return Math.floor(ts / 1000);
  return ts;
}

/**
 * Format timestamp safely.
 */
export function formatTime(ts: number | undefined | null): string {
  const ms = toMs(ts);
  if (ms === null) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
}
