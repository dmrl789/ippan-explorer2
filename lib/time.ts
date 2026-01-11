/**
 * Shared timestamp utilities for server and client.
 */

/**
 * Convert timestamp to milliseconds.
 *
 * DevNet timestamps may be in microseconds (~1e15).
 * This function detects and converts them to milliseconds for use with Date().
 *
 * Heuristic: microseconds are ~1e15, milliseconds are ~1e12.
 * Values > 50 trillion are assumed to be microseconds.
 */
export function toMs(ts: number | undefined | null): number | null {
  if (ts === undefined || ts === null || isNaN(ts)) return null;

  // If timestamp is > 50 trillion, it's likely microseconds
  if (ts > 50_000_000_000_000) {
    return Math.floor(ts / 1000);
  }

  return ts;
}

/**
 * Convert a timestamp (in ms or µs) into ms.
 * Accepts both number and string inputs (API may return either).
 *
 * If ts is > 50 trillion, treat as microseconds and divide by 1,000.
 */
export function normalizeTimestamp(ts: number | string | undefined | null): number | null {
  if (ts === undefined || ts === null) return null;

  const num = typeof ts === "string" ? parseInt(ts, 10) : ts;

  if (isNaN(num)) return null;

  // If timestamp is > 50 trillion, it's likely microseconds
  if (num > 50_000_000_000_000) {
    return Math.floor(num / 1000);
  }

  return num;
}

/**
 * Format a timestamp (possibly in microseconds) to a locale string.
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

/**
 * Format a timestamp (possibly in microseconds or as string) to a locale string.
 * More flexible version that handles string timestamps from the API.
 */
export function formatTimestamp(ts: number | string | undefined | null): string {
  const ms = normalizeTimestamp(ts);
  if (ms === null) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
}

/**
 * Format a timestamp to ISO string (useful for SSR where locale is not available).
 */
export function formatTimeISO(ts: number | string | undefined | null): string {
  const ms = normalizeTimestamp(ts);
  if (ms === null) return "—";
  try {
    return new Date(ms).toISOString();
  } catch {
    return "—";
  }
}
