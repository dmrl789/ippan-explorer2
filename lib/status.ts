import { getRpcBaseUrl } from "./rpcBase";
import { getStatus } from "./mockData";
import type { StatusResponseV1 } from "@/types/rpc";

export async function fetchStatus(): Promise<StatusResponseV1> {
  const rpcBase = getRpcBaseUrl();
  if (!rpcBase) {
    return getStatus();
  }

  try {
    const res = await fetch(`${rpcBase}/status`);
    if (!res.ok) {
      throw new Error(`RPC status failed: ${res.status}`);
    }
    return res.json();
  } catch (error) {
    console.warn("Falling back to mock status due to RPC error", error);
    return getStatus();
  }
}
