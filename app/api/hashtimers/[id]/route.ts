import { NextResponse } from "next/server";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { mockHashtimer } from "@/lib/mockData";
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
  const rpcBase = getRpcBaseUrl();

  if (rpcBase) {
    try {
      const response = await fetch(`${rpcBase}/hashtimers/${id}`);
      if (response.ok) {
        const data = (await response.json()) as HashTimerDetail;
        return NextResponse.json(normalizeIppanTime(data));
      }
    } catch (error) {
      console.error("Falling back to mock HashTimer detail", error);
    }
  }

  return NextResponse.json(normalizeIppanTime(mockHashtimer(id)));
}
