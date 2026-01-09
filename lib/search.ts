import { safeJsonFetchWithStatus } from "@/lib/rpc";
import { HASHTIMER_RE } from "@/lib/hashtimer";
import { fetchHandleRecord } from "@/lib/handles";

export type SearchResolution =
  | { kind: "redirect"; to: string }
  | { kind: "not_found"; reason: string; normalized: string };

function normalizeQuery(input: string): string {
  return input.trim();
}

function normalizeHashTimerCandidate(value: string): string | undefined {
  const trimmed = value.trim();
  const withoutPrefix = trimmed.replace(/^HT-/i, "");
  const without0x = withoutPrefix.replace(/^0x/i, "");
  const lower = without0x.toLowerCase();
  return HASHTIMER_RE.test(lower) ? lower : undefined;
}

function normalizeHex64Candidate(value: string): string | undefined {
  const trimmed = value.trim();
  const withoutPrefix = trimmed.replace(/^0x/i, "");
  const lower = withoutPrefix.toLowerCase();
  return /^[0-9a-f]{64}$/.test(lower) ? lower : undefined;
}

function normalizeAccountCandidate(value: string): string | undefined {
  const trimmed = value.trim();
  // Prefer typical 20-byte (40 hex) addresses; avoid stealing 64-hex hashes.
  if (/^0x[0-9a-fA-F]{40}$/.test(trimmed)) return trimmed.toLowerCase();
  if (/^[0-9a-fA-F]{40}$/.test(trimmed)) return `0x${trimmed.toLowerCase()}`;
  return undefined;
}

function normalizeNumericCandidate(value: string): string | undefined {
  const trimmed = value.trim();
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  return /^[0-9]+$/.test(withoutHash) ? withoutHash : undefined;
}

function looksLikeHandle(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith("@") || /\.[Ii][Pp][Nn]\b/.test(trimmed) || /\.[Aa][Ii]\b/.test(trimmed);
}

async function probeTx(hash: string): Promise<boolean> {
  const { status } = await safeJsonFetchWithStatus<unknown>(`/tx/${encodeURIComponent(hash)}`);
  return status !== null && status >= 200 && status < 300;
}

async function probeBlock(idOrHash: string): Promise<boolean> {
  const primary = await safeJsonFetchWithStatus<unknown>(`/block/${encodeURIComponent(idOrHash)}`);
  if (primary.status !== null && primary.status >= 200 && primary.status < 300) return true;

  if (primary.status === 404) {
    const legacy = await safeJsonFetchWithStatus<unknown>(`/blocks/${encodeURIComponent(idOrHash)}`);
    return legacy.status !== null && legacy.status >= 200 && legacy.status < 300;
  }

  return false;
}

async function probeHashTimer(id: string): Promise<boolean> {
  const { status } = await safeJsonFetchWithStatus<unknown>(`/hashtimers/${encodeURIComponent(id)}`);
  return status !== null && status >= 200 && status < 300;
}

async function probeRound(id: string): Promise<boolean> {
  const { status } = await safeJsonFetchWithStatus<unknown>(`/round/${encodeURIComponent(id)}`);
  return status !== null && status >= 200 && status < 300;
}

export async function resolveSearch(query: string): Promise<SearchResolution> {
  const normalized = normalizeQuery(query);
  if (!normalized) return { kind: "not_found", reason: "empty_query", normalized };

  // 1) Handle (explicit)
  if (looksLikeHandle(normalized)) {
    return { kind: "redirect", to: `/handle/${encodeURIComponent(normalized)}` };
  }

  // 2) Account address (typical)
  const account = normalizeAccountCandidate(normalized);
  if (account) {
    return { kind: "redirect", to: `/account/${encodeURIComponent(account)}` };
  }

  // 3) Round / height
  const numeric = normalizeNumericCandidate(normalized);
  if (numeric) {
    // Prefer round; fallback to block height if round endpoint isn't available.
    if (await probeRound(numeric)) return { kind: "redirect", to: `/round/${encodeURIComponent(numeric)}` };
    if (await probeBlock(numeric)) return { kind: "redirect", to: `/block/${encodeURIComponent(numeric)}` };
    return { kind: "not_found", reason: "height_not_found", normalized };
  }

  // 4) Hash-like (tx/block/hashtimer)
  const hex64 = normalizeHex64Candidate(normalized);
  if (hex64) {
    // Try in priority order (tx → block → hashtimer)
    if (await probeTx(hex64)) return { kind: "redirect", to: `/tx/${encodeURIComponent(hex64)}` };
    if (await probeBlock(hex64)) return { kind: "redirect", to: `/block/${encodeURIComponent(hex64)}` };
    if (await probeHashTimer(hex64)) return { kind: "redirect", to: `/hashtimer/${encodeURIComponent(hex64)}` };
    return { kind: "not_found", reason: "hash_not_found", normalized: hex64 };
  }

  // 5) Explicit HashTimer prefix (HT-...)
  const ht = normalizeHashTimerCandidate(normalized);
  if (ht) {
    if (await probeHashTimer(ht)) return { kind: "redirect", to: `/hashtimer/${encodeURIComponent(ht)}` };
    return { kind: "not_found", reason: "hashtimer_not_found", normalized: ht };
  }

  // 6) Fallback: try handle lookup; otherwise give a clean not-found.
  const handleTry = await fetchHandleRecord(normalized);
  if (handleTry.ok && handleTry.record) {
    return { kind: "redirect", to: `/handle/${encodeURIComponent(normalized)}` };
  }

  return { kind: "not_found", reason: "unrecognized_query", normalized };
}

