import { NextResponse } from "next/server";
import { rpcFetch } from "@/lib/rpcBase";

export async function GET() {
  try {
    const data = await rpcFetch<any>("/status");
    return NextResponse.json({ ok: true, source: "live", data }, { status: 200 });
  } catch (err) {
    console.error("[/api/status] RPC error", err);
    return NextResponse.json({ ok: false, source: "error", error: "IPPAN devnet RPC unavailable" }, { status: 502 });
  }
}
