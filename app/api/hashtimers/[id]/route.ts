import { NextResponse } from "next/server";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { mockHashtimer } from "@/lib/mockData";
import type { HashTimerDetail } from "@/types/rpc";

interface Params {
  params: { id: string };
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = params;
  const rpcBase = getRpcBaseUrl();

  if (rpcBase) {
    try {
      const response = await fetch(`${rpcBase}/hashtimers/${id}`);
      if (response.ok) {
        const data = (await response.json()) as HashTimerDetail;
        return NextResponse.json(data);
      }
    } catch (error) {
      console.error("Falling back to mock HashTimer detail", error);
    }
  }

  return NextResponse.json(mockHashtimer(id));
}
