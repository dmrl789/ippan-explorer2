import { NextResponse } from "next/server";
import { safeJsonFetch } from "@/lib/rpc";

export async function GET() {
  const data = await safeJsonFetch<any>("/peers");
  if (!data) {
    return NextResponse.json({ ok: false, source: "error", error: "IPPAN devnet RPC unavailable" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, source: "live", data }, { status: 200 });
}
