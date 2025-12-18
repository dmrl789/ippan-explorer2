import { NextResponse } from "next/server";
import { rpcFetch } from "@/lib/rpc";

export async function GET() {
  try {
    const [statusRes, healthRes, aiRes] = await Promise.allSettled([
      rpcFetch<any>("/status"),
      rpcFetch<any>("/health"),
      rpcFetch<any>("/ai/status"),
    ]);

    // Required: /status and /health must work
    if (statusRes.status !== "fulfilled" || healthRes.status !== "fulfilled") {
      return NextResponse.json(
        {
          ok: false,
          source: "live",
          error: "Required devnet endpoints `/status` or `/health` are unavailable",
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
      },
      { status: 502 },
    );
  }
}
