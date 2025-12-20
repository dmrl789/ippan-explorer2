import { NextResponse } from "next/server";
import { safeJsonFetch, IPPAN_RPC_BASE } from "@/lib/rpc";

export async function GET() {
  try {
    const data = await safeJsonFetch<any>("/peers");
    if (!data) {
      return NextResponse.json(
        {
          ok: false,
          source: "error",
          error: "IPPAN devnet RPC unavailable",
          rpc_base: IPPAN_RPC_BASE,
          error_details: "safeJsonFetch returned null for /peers",
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ ok: true, source: "live", data, rpc_base: IPPAN_RPC_BASE }, { status: 200 });
  } catch (err: any) {
    console.error("[api/peers] devnet error", err);
    return NextResponse.json(
      {
        ok: false,
        source: "error",
        error: "IPPAN devnet RPC unavailable",
        rpc_base: IPPAN_RPC_BASE,
        error_details: err?.message ?? String(err),
      },
      { status: 502 },
    );
  }
}
