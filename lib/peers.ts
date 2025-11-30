import type { PeersResponse } from "@/types/rpc";
import { getRpcBaseUrl } from "./rpcBase";
import { getPeers as getMockPeers } from "./mockData";

export async function fetchPeers(): Promise<PeersResponse> {
  const rpcBase = getRpcBaseUrl();
  if (!rpcBase) {
    return getMockPeers();
  }

  try {
    const res = await fetch(`${rpcBase}/peers`);
    if (!res.ok) {
      throw new Error(`RPC peers failed: ${res.status}`);
    }

    const data = (await res.json()) as PeersResponse;
    if (!Array.isArray(data.peers)) {
      throw new Error("RPC peers payload missing peers array");
    }

    return { source: "rpc", peers: data.peers };
  } catch (error) {
    console.warn("Falling back to mock peers due to RPC error", error);
    return getMockPeers();
  }
}
