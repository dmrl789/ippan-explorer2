import type { IpndhtHandleRecord } from "@/types/rpc";
import { RpcError, rpcFetch } from "@/lib/rpcBase";

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

  let sawNon404Error = false;

  for (const path of candidates) {
    try {
      const payload = await rpcFetch<any>(path);
      if (payload && typeof payload === "object") {
        const record =
          Array.isArray(payload?.handles) && payload.handles.length
            ? normalizeHandle(payload.handles[0], normalized)
            : normalizeHandle(payload, normalized);
        return { ok: true, source: "live", record };
      }
    } catch (error) {
      if (error instanceof RpcError && error.status === 404) {
        continue;
      }
      sawNon404Error = true;
      console.error("[handles lookup] RPC error", error);
      break;
    }
  }

  if (sawNon404Error) {
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable" };
  }

  // If all lookup variants 404, treat as "not found" (RPC reachable).
  return { ok: true, source: "live", record: null };
}

