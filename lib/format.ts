import { normalizeTimestamp } from "./time";

/**
 * Format a timestamp (possibly in microseconds or as string) to a locale string.
 * Handles microsecond timestamps by converting to milliseconds first.
 */
export function formatTimestamp(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return "—";
  const ms = normalizeTimestamp(value);
  if (ms === null) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
}

export function formatAmount(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} IPN`;
}

export function shortenHash(hash: string, size = 10) {
  if (hash.length <= size * 2) return hash;
  return `${hash.slice(0, size)}…${hash.slice(-size)}`;
}
