import { toMsFromUs } from "./ippanTime";
import { getRpcBaseUrl } from "./rpcBase";
import { getStatus } from "./mockData";
import type { StatusResponseV1 } from "@/types/rpc";

function ensureHeadTime(status: StatusResponseV1): StatusResponseV1 {
  const head = { ...status.head };

  let headMs = head.ippan_time_ms;
  if (headMs === undefined && head.ippan_time_us) {
    headMs = toMsFromUs(head.ippan_time_us);
  }
  if (headMs === undefined && head.ippan_time) {
    headMs = new Date(head.ippan_time).getTime();
  }
  if (headMs === undefined) {
    headMs = Date.now();
  }

  head.ippan_time_ms = headMs;
  if (!head.ippan_time_us) {
    head.ippan_time_us = (BigInt(Math.trunc(headMs)) * 1000n).toString();
  }
  if (!head.ippan_time) {
    head.ippan_time = new Date(headMs).toISOString();
  }

  return { ...status, head };
}

export async function fetchStatusWithSource(): Promise<{ status: StatusResponseV1; source: "rpc" | "mock" }> {
  const rpcBase = getRpcBaseUrl();
  if (!rpcBase) {
    return { status: ensureHeadTime(await getStatus()), source: "mock" };
  }

  try {
    const res = await fetch(`${rpcBase}/status`);
    if (!res.ok) {
      throw new Error(`RPC status failed: ${res.status}`);
    }
    const status = ensureHeadTime((await res.json()) as StatusResponseV1);
    return { status, source: "rpc" };
  } catch (error) {
    console.warn("Falling back to mock status due to RPC error", error);
    return { status: ensureHeadTime(await getStatus()), source: "mock" };
  }
}

export async function fetchStatus(): Promise<StatusResponseV1> {
  const { status } = await fetchStatusWithSource();
  return status;
}
