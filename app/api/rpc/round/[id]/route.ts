import { NextRequest, NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/rpc/round/[id]
 * 
 * Proxies to upstream /round/:id
 * Returns details for a specific consensus round.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const roundId = params.id;
  
  if (!roundId) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_round_id",
        error_code: "MISSING_PARAM",
        detail: "Round ID is required",
        rpc_base: "",
        path: "/round/[id]",
        ts: Date.now(),
      },
      { status: 400 }
    );
  }

  const result = await proxyRpcRequest(`/round/${encodeURIComponent(roundId)}`, {
    timeout: 4000,
  });

  if (!result.ok) {
    // 404 is a valid response (round not found)
    const status = result.status_code === 404 ? 404 : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
