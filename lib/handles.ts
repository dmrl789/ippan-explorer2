import type { IpndhtHandleRecord, RpcSource } from "@/types/rpc";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { getIpndht } from "@/lib/mockData";

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

async function fetchHandlesList(): Promise<{ source: RpcSource; handles: IpndhtHandleRecord[] }> {
  const rpcBase = getRpcBaseUrl();
  if (!rpcBase) {
    const mock = await getIpndht();
    return { source: "mock", handles: mock.latest_handles };
  }

  try {
    const res = await fetch(`${rpcBase}/handles`);
    if (!res.ok) throw new Error(`RPC handles failed: ${res.status}`);
    const payload = await res.json();
    const rawHandles: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.handles) ? payload.handles : [];
    return { source: "rpc", handles: rawHandles.map((record, idx) => normalizeHandle(record, `handle-${idx}`)) };
  } catch (error) {
    console.warn("Falling back to mock handles due to RPC error", error);
    const mock = await getIpndht();
    return { source: "mock", handles: mock.latest_handles };
  }
}

export async function fetchHandleRecord(handle: string): Promise<{ source: RpcSource; record?: IpndhtHandleRecord }> {
  const rpcBase = getRpcBaseUrl();
  const normalized = handle.trim();

  if (rpcBase) {
    // Try common "lookup" patterns first.
    const candidates = [
      `${rpcBase}/handles/${encodeURIComponent(normalized)}`,
      `${rpcBase}/handles?query=${encodeURIComponent(normalized)}`,
      `${rpcBase}/handles?handle=${encodeURIComponent(normalized)}`
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const payload = await res.json();
        if (payload && typeof payload === "object") {
          const record =
            Array.isArray(payload?.handles) && payload.handles.length
              ? normalizeHandle(payload.handles[0], normalized)
              : normalizeHandle(payload, normalized);
          return { source: "rpc", record };
        }
      } catch {
        // keep trying other candidates
      }
    }
  }

  const list = await fetchHandlesList();
  const record = list.handles.find((candidate) => candidate.handle === normalized);
  return { source: list.source, record };
}

