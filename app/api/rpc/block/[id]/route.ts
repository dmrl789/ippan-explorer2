import { NextRequest, NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/rpc/block/[id]
 * 
 * Proxies to upstream /block/:id (or /blocks/:id as fallback)
 * Returns details for a specific block by hash or ID.
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const blockId = params.id;
  
  if (!blockId) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_block_id",
        error_code: "MISSING_PARAM",
        detail: "Block ID is required",
        rpc_base: "",
        path: "/block/[id]",
        ts: Date.now(),
      },
      { status: 400 }
    );
  }

  // Try /block/:id first (preferred endpoint)
  let result = await proxyRpcRequest(`/block/${encodeURIComponent(blockId)}`, {
    timeout: 4000,
  });

  // If 404, try legacy /blocks/:id endpoint
  if (!result.ok && result.status_code === 404) {
    const legacyResult = await proxyRpcRequest(`/blocks/${encodeURIComponent(blockId)}`, {
      timeout: 4000,
    });
    
    // Use legacy result if successful
    if (legacyResult.ok) {
      result = {
        ...legacyResult,
        // Add metadata indicating fallback was used
        data: {
          ...(legacyResult.data as object),
          _explorer_meta: {
            fetched_via: "legacy_blocks_endpoint",
            original_path: `/blocks/${blockId}`,
          },
        },
      };
    }
  }

  if (!result.ok) {
    // 404 is a valid response (block not found)
    const status = result.status_code === 404 ? 404 : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
