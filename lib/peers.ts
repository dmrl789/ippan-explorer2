import type { PeersResponse } from "@/types/rpc";
import { rpcFetch } from "./rpcBase";

export async function fetchPeers(): Promise<
  | { ok: true; source: "live"; peers: PeersResponse["peers"] }
  | { ok: false; source: "error"; error: string; peers: PeersResponse["peers"] }
> {
  try {
    const data = await rpcFetch<any>("/peers");
    const peers: PeersResponse["peers"] = Array.isArray(data?.peers) ? data.peers : Array.isArray(data) ? data : [];
    if (!Array.isArray(peers)) {
      throw new Error("RPC peers payload missing peers array");
    }
    return { ok: true, source: "live", peers };
  } catch (error) {
    console.error("[peers] RPC error", error);
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable", peers: [] };
  }
}
