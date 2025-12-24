import type { PeersResponse } from "@/types/rpc";
import { safeJsonFetchWithStatus } from "./rpc";

export async function fetchPeers(): Promise<
  | { ok: true; source: "live"; peers: PeersResponse["peers"] }
  | { ok: false; source: "error"; error: string; errorCode?: string; peers: PeersResponse["peers"] }
> {
  const { status, data } = await safeJsonFetchWithStatus<any>("/peers");

  // 404 means endpoint not implemented yet (expected for some DevNet phases)
  if (status === 404) {
    return {
      ok: false,
      source: "error",
      error: "Peer endpoint not available on this DevNet (404 expected)",
      errorCode: "endpoint_not_available",
      peers: [],
    };
  }

  // No response means gateway is unreachable
  if (!data) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
      peers: [],
    };
  }

  const peers: PeersResponse["peers"] = Array.isArray(data?.peers)
    ? data.peers
    : Array.isArray(data)
      ? data
      : [];

  return { ok: true, source: "live", peers };
}
