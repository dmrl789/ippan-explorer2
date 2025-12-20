import { NextResponse } from "next/server";
import { rpcFetch, IPPAN_RPC_BASE } from "@/lib/rpc";

export async function GET() {
  try {
    const [statusRes, healthRes, aiRes] = await Promise.allSettled([
      rpcFetch<any>("/status"),
      rpcFetch<any>("/health"),
      rpcFetch<any>("/ai/status"),
    ]);

    // Required: /status and /health must work
    if (statusRes.status !== "fulfilled" || healthRes.status !== "fulfilled") {
      // Extract error details for debugging
      const statusError = statusRes.status === "rejected" ? statusRes.reason : null;
      const healthError = healthRes.status === "rejected" ? healthRes.reason : null;
      
      return NextResponse.json(
        {
          ok: false,
          source: "live",
          error: "Required devnet endpoints `/status` or `/health` are unavailable",
          rpc_base: IPPAN_RPC_BASE,
          error_details: {
            status_error: statusError?.message ?? String(statusError),
            health_error: healthError?.message ?? String(healthError),
          },
        },
        { status: 502 },
      );
    }

    // Optional: /ai/status may fail or be not exposed yet
    const ai = aiRes.status === "fulfilled" ? aiRes.value : null;

    return NextResponse.json(
      {
        ok: true,
        source: "live",
        status: statusRes.value,
        health: healthRes.value,
        ai,
        aiAvailable: ai !== null,
        rpc_base: IPPAN_RPC_BASE,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("[api/status] devnet error", err);
    return NextResponse.json(
      {
        ok: false,
        source: "live",
        error: "IPPAN devnet RPC unavailable",
        rpc_base: IPPAN_RPC_BASE,
        error_details: err?.message ?? String(err),
      },
      { status: 502 },
    );
  }
}
