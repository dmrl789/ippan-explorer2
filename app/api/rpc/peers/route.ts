import { NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/rpc/peers
 * 
 * Proxies to upstream /peers endpoint.
 * Returns list of connected peers.
 */
export async function GET() {
  const result = await proxyRpcRequest("/peers", { timeout: 5000 });

  if (!result.ok) {
    // 404 means endpoint not implemented - try to get peers from /status instead
    if (result.status_code === 404) {
      const statusResult = await proxyRpcRequest("/status", { timeout: 5000 });
      if (statusResult.ok && statusResult.data) {
        const statusData = statusResult.data as Record<string, unknown>;
        if (Array.isArray(statusData.peers)) {
          return NextResponse.json(
            { ok: true, data: statusData.peers, source: "status_fallback" },
            { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
          );
        }
      }
      return NextResponse.json(
        { ok: false, error: "peers_not_available", detail: "Neither /peers nor /status.peers exposed" },
        { status: 404, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result, { 
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
