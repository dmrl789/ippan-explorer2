import { NextRequest, NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/rpc/tx/recent
 * 
 * Proxies to upstream /tx/recent with optional limit parameter.
 * Returns recent transactions from the DevNet.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || "50";
  
  // Validate limit
  const limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_limit",
        error_code: "INVALID_PARAM",
        detail: "Limit must be between 1 and 200",
        rpc_base: "",
        path: "/tx/recent",
        ts: Date.now(),
      },
      { status: 400 }
    );
  }

  const result = await proxyRpcRequest(`/tx/recent?limit=${limitNum}`, {
    timeout: 8000, // Allow more time for large lists
  });

  if (!result.ok) {
    // 404 means endpoint not implemented yet
    const status = result.status_code === 404 ? 404 : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
