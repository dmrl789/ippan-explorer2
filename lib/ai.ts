import type { AiStatus, RpcSource } from "@/types/rpc";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { getAiStatus as getMockAiStatus } from "@/lib/mockData";

export async function fetchAiStatusWithSource(): Promise<{ source: RpcSource; ai: AiStatus }> {
  const rpcBase = getRpcBaseUrl();
  if (!rpcBase) {
    return { source: "mock", ai: await getMockAiStatus() };
  }

  try {
    const res = await fetch(`${rpcBase}/ai/status`);
    if (!res.ok) throw new Error(`RPC ai/status failed: ${res.status}`);
    const ai = (await res.json()) as AiStatus;
    return { source: "rpc", ai };
  } catch (error) {
    console.warn("Falling back to mock AI status due to RPC error", error);
    return { source: "mock", ai: await getMockAiStatus() };
  }
}

