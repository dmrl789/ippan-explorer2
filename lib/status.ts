import { getRpcBaseUrl } from "./rpcBase";
import { getStatus } from "./mockData";
import type { StatusResponseV1 } from "@/types/rpc";

export async function fetchStatusWithSource(): Promise<{ status: StatusResponseV1; source: "rpc" | "mock" }> {
  const rpcBase = getRpcBaseUrl();
  if (!rpcBase) {
    return { status: await getStatus(), source: "mock" };
  }

  try {
    const res = await fetch(`${rpcBase}/status`);
    if (!res.ok) {
      throw new Error(`RPC status failed: ${res.status}`);
    }
    const status = (await res.json()) as StatusResponseV1;
    return { status, source: "rpc" };
  } catch (error) {
    console.warn("Falling back to mock status due to RPC error", error);
    return { status: await getStatus(), source: "mock" };
  }
}

export async function fetchStatus(): Promise<StatusResponseV1> {
  const { status } = await fetchStatusWithSource();
  return status;
}
