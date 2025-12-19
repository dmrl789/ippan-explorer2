import type { IpndhtHandleRecord } from "@/types/rpc";
import { safeJsonFetchWithStatus } from "@/lib/rpc";

function normalizeHandle(record: any, fallback: string): IpndhtHandleRecord {
  const handle = typeof record?.handle === "string" && record.handle.length > 0 ? record.handle : fallback;
  const expires =
    typeof record?.expires_at === "string"
      ? record.expires_at
      : typeof record?.expiresAt === "string"
        ? record.expiresAt
        : undefined;

  return {
    handle,
    owner: typeof record?.owner === "string" ? record.owner : typeof record?.address === "string" ? record.address : undefined,
    expires_at: expires,
    hash_timer_id: typeof record?.hash_timer_id === "string" ? record.hash_timer_id : undefined
  };
}

export async function fetchHandleRecord(
  handle: string
): Promise<
  | { ok: true; source: "live"; record: IpndhtHandleRecord }
  | { ok: true; source: "live"; record: null }
  | { ok: false; source: "error"; error: string }
> {
  const normalized = handle.trim();

  // Try common "lookup" patterns first.
  const candidates = [
    `/handles/${encodeURIComponent(normalized)}`,
    `/handles?query=${encodeURIComponent(normalized)}`,
    `/handles?handle=${encodeURIComponent(normalized)}`
  ];

  for (const path of candidates) {
    const { status, data } = await safeJsonFetchWithStatus<any>(path);
    if (status === 404) continue;
    if (!data) return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable" };

    if (data && typeof data === "object") {
      const record =
        Array.isArray((data as any)?.handles) && (data as any).handles.length
          ? normalizeHandle((data as any).handles[0], normalized)
          : normalizeHandle(data, normalized);
      return { ok: true, source: "live", record };
    }
  }

  // If all lookup variants 404, treat as "not found" (RPC reachable).
  return { ok: true, source: "live", record: null };
}

