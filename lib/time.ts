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
