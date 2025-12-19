import type { PeersResponse } from "@/types/rpc";
import { safeJsonFetch } from "./rpc";

export async function fetchPeers(): Promise<
  | { ok: true; source: "live"; peers: PeersResponse["peers"] }
  | { ok: false; source: "error"; error: string; peers: PeersResponse["peers"] }
> {
  const data = await safeJsonFetch<any>("/peers");
  if (!data) {
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable", peers: [] };
  }
  const peers: PeersResponse["peers"] = Array.isArray(data?.peers) ? data.peers : Array.isArray(data) ? data : [];
  return { ok: true, source: "live", peers };
}
