import type { HealthStatus, RpcSource } from "@/types/rpc";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { getHealthStatus as getMockHealthStatus } from "@/lib/mockData";

export async function fetchHealthWithSource(): Promise<{ source: RpcSource; health: HealthStatus }> {
  const rpcBase = getRpcBaseUrl();
  if (!rpcBase) {
    return { source: "mock", health: await getMockHealthStatus() };
  }

  try {
    const res = await fetch(`${rpcBase}/health`);
    if (!res.ok) throw new Error(`RPC health failed: ${res.status}`);
    const health = (await res.json()) as HealthStatus;
    return { source: "rpc", health };
  } catch (error) {
    console.warn("Falling back to mock health due to RPC error", error);
    return { source: "mock", health: await getMockHealthStatus() };
  }
}

