import { HASHTIMER_RE, isHashTimerId } from "@/lib/hashtimer";

export { isHashTimerId };

export function isTxHash(value: string): boolean {
  const trimmed = value.trim();
  return /^(0x)?[a-fA-F0-9]{64}$/.test(trimmed) || /^0x[a-zA-Z0-9]{64}$/.test(trimmed);
}

export function isBlockHeight(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

export function isHandle(value: string): boolean {
  return /^@[A-Za-z0-9._-]+\.(?:ipn|ai)$/.test(value.trim());
}

export function isAddress(value: string): boolean {
  return /^0x[a-zA-Z0-9]{20,}$/.test(value.trim());
}

function normalizeHashTimerInput(value: string): string | undefined {
  const withoutPrefix = value.replace(/^HT-/i, "");
  const lower = withoutPrefix.toLowerCase();
  if (HASHTIMER_RE.test(lower)) {
    return lower;
  }
  return undefined;
}

export function routeForQuery(query: string): string {
  const value = query.trim();
  if (!value) return "/";

  // Keep this helper lightweight: always route through the server-side resolver so we can disambiguate
  // tx vs block vs hashtimer hashes without leaking CORS / mixed-content complexity to the browser.
  return `/search?q=${encodeURIComponent(value)}`;
}
