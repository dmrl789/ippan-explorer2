import { NextRequest, NextResponse } from "next/server";
import { getBlocksWithFallback } from "@/lib/blocksService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_BLOCKS = 25;

/**
 * GET /api/rpc/blocks
 * 
 * Returns a list of recent blocks with robust fallback.
 * Uses shared blocksService so SSR pages can get the same data directly.
 * 
 * Query params:
 *   - limit: number of blocks to return (default 25, max 25)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit") || String(MAX_BLOCKS);
  const limit = Math.min(parseInt(limitParam, 10) || MAX_BLOCKS, MAX_BLOCKS);
  
  const response = await getBlocksWithFallback(limit);

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
