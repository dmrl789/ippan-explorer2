import { NextResponse } from "next/server";
import { rpcFetch } from "@/lib/rpcBase";
import { toMsFromUs } from "@/lib/ippanTime";
import type { HashTimerDetail } from "@/types/rpc";

interface Params {
  params: { id: string };
}

function normalizeIppanTime(detail: HashTimerDetail): HashTimerDetail {
  const normalized = { ...detail };

  let timeMs = normalized.ippan_time_ms;
  if (timeMs === undefined && normalized.ippan_time_us) {
    timeMs = toMsFromUs(normalized.ippan_time_us);
  }
  if (timeMs === undefined && normalized.ippan_time) {
    timeMs = new Date(normalized.ippan_time).getTime();
  }
  if (timeMs === undefined) {
    timeMs = Date.now();
  }

  normalized.ippan_time_ms = timeMs;
  if (!normalized.ippan_time_us) {
    normalized.ippan_time_us = (BigInt(Math.trunc(timeMs)) * 1000n).toString();
  }
  if (!normalized.ippan_time) {
    normalized.ippan_time = new Date(timeMs).toISOString();
  }

  return normalized;
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = params;
  try {
    const data = await rpcFetch<HashTimerDetail>(`/hashtimers/${encodeURIComponent(id)}`);
    return NextResponse.json({ ok: true, source: "live", data: normalizeIppanTime(data) }, { status: 200 });
  } catch (err) {
    console.error("[/api/hashtimers/:id] RPC error", err);
    return NextResponse.json({ ok: false, source: "error", error: "IPPAN devnet RPC unavailable" }, { status: 502 });
  }
}
