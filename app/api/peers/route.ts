import { NextResponse } from "next/server";
import { rpcFetch } from "@/lib/rpc";

export async function GET() {
  try {
    const data = await rpcFetch<any>("/peers");
    return NextResponse.json({ ok: true, source: "live", data }, { status: 200 });
  } catch (err) {
    console.error("[/api/peers] RPC error", err);
    return NextResponse.json({ ok: false, source: "error", error: "IPPAN devnet RPC unavailable" }, { status: 502 });
  }
}
