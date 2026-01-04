import { safeJsonFetchWithStatus } from "@/lib/rpc";
import { normalizeBlockList, normalizeBlock, type BlockSummary, type BlockDetail } from "@/lib/normalize";

export type { BlockSummary, BlockDetail } from "@/lib/normalize";

export async function fetchRecentBlocks(): Promise<
  | { ok: true; source: "live"; blocks: BlockSummary[]; meta?: Record<string, unknown> }
  | { ok: false; source: "error"; error: string; errorCode?: string; blocks: BlockSummary[] }
> {
  const { status, data: payload } = await safeJsonFetchWithStatus<unknown>("/blocks");
  
  // Handle network/connection errors
  if (status === null) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
      blocks: []
    };
  }
  
  // 404 is handled by the proxy fallback - if we still get 404, it means fallback also failed
  if (status === 404) {
    return {
      ok: false,
      source: "error",
      error: "Block list endpoint not available on this DevNet (404). The node is online but does not expose /blocks yet.",
      errorCode: "endpoint_not_available",
      blocks: []
    };
  }
  
  if (!payload) {
    return {
      ok: false,
      source: "error",
      error: `Unexpected error fetching blocks (HTTP ${status})`,
      errorCode: "unknown_error",
      blocks: []
    };
  }

  // Normalize the response
  const blocks = normalizeBlockList(payload);
  
  // Extract meta if available (from our enhanced proxy response)
  const meta = (payload as Record<string, unknown>)?.meta as Record<string, unknown> | undefined;
  
  return { 
    ok: true, 
    source: "live", 
    blocks,
    meta
  };
}

export async function fetchBlockDetail(
  id: string
): Promise<
  | { ok: true; source: "live"; block: BlockDetail }
  | { ok: true; source: "live"; block: null; notFoundReason?: string }
  | { ok: false; source: "error"; error: string; errorCode?: string }
> {
  // Try /block/:id endpoint (uses our proxy which has fallback logic)
  const { status, data } = await safeJsonFetchWithStatus<unknown>(`/block/${encodeURIComponent(id)}`);

  if (status === null) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable"
    };
  }

  if (status === 404) {
    return { 
      ok: true, 
      source: "live", 
      block: null,
      notFoundReason: "Block not found on this DevNet. The block may not exist, or the DevNet may not have recorded it yet."
    };
  }
  
  if (!data) {
    return { 
      ok: false, 
      source: "error", 
      error: `Unexpected error fetching block (HTTP ${status})`,
      errorCode: "unknown_error"
    };
  }

  const block = normalizeBlock(data);
  
  if (!block) {
    return {
      ok: true,
      source: "live",
      block: null,
      notFoundReason: "Block data could not be parsed. The RPC response format may have changed."
    };
  }

  return { ok: true, source: "live", block };
}
