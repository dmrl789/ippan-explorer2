import { toMsFromUs } from "./ippanTime";
import { rpcFetch } from "./rpcBase";
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

export async function fetchStatusWithSource(): Promise<
  | { ok: true; source: "live"; status: StatusResponseV1 }
  | { ok: false; source: "error"; error: string }
> {
  try {
    const status = ensureHeadTime(await rpcFetch<StatusResponseV1>("/status"));
    return { ok: true, source: "live", status };
  } catch (error) {
    console.error("[status] RPC error", error);
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable" };
  }
}
