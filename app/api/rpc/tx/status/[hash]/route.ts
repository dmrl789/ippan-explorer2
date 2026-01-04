import { NextRequest, NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ hash: string }>;
}

/**
 * GET /api/rpc/tx/status/[hash]
 * 
 * Proxies to upstream /tx/status/:hash
 * Returns the status of a specific transaction.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const txHash = params.hash;
  
  if (!txHash) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_tx_hash",
        error_code: "MISSING_PARAM",
        detail: "Transaction hash is required",
        rpc_base: "",
        path: "/tx/status/[hash]",
        ts: Date.now(),
      },
      { status: 400 }
    );
  }

  const result = await proxyRpcRequest(`/tx/status/${encodeURIComponent(txHash)}`, {
    timeout: 4000,
  });

  if (!result.ok) {
    // 404 is a valid response (transaction not found)
    const status = result.status_code === 404 ? 404 : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
