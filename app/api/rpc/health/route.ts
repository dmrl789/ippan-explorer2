import { NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/rpc/health
 * 
 * Proxies to upstream /health endpoint.
 * Returns 404 if endpoint not exposed (expected in early DevNet).
 * Returns 502 only for actual upstream errors.
 */
export async function GET() {
  const result = await proxyRpcRequest("/health", { timeout: 4000 });

  if (!result.ok) {
    // 404 or 501 = endpoint not exposed (expected, not an error)
    if (result.status_code === 404 || result.status_code === 501) {
      return NextResponse.json(
        { ok: false, error_code: `HTTP_${result.status_code}`, detail: "Health endpoint not exposed on this node" },
        { status: result.status_code, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }
    // Actual upstream error
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result, { 
    status: 200,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
