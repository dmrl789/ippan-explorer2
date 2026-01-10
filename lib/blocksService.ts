/**
 * Shared blocks service - used by BOTH SSR pages AND API routes.
 * 
 * This eliminates the "fetch myself over HTTP" problem in Vercel serverless
 * by letting SSR pages call the same logic the API uses directly.
 */

import { proxyRpcRequest, getServerRpcBase } from "./rpcProxy";

// ============================================================================
// Types
// ============================================================================

export type BlocksSource = "upstream_blocks" | "fallback_tx_recent";
export type FallbackReason = "blocks_404" | "blocks_error" | "blocks_empty" | null;

export interface TxRecentItem {
  tx_id?: string;
  hash?: string;
  status?: string;
  status_v2?: string;
  included?: {
    block_hash?: string;
    round_id?: number | string;
  };
  block_hash?: string;
  first_seen_ts?: string;
}

export interface HydratedBlock {
  block_hash: string;
  prev_block_hash?: string;
  round_id?: number | string;
  hashtimer?: string;
  hash_timer_id?: string;
  tx_count?: number;
  tx_ids?: string[];
  timestamp?: string | number;
  ippan_time_ms?: number;
  header?: Record<string, unknown>;
  _hydration_failed?: boolean;
  _hydration_error?: string;
}

export interface BlocksApiResponse {
  ok: boolean;
  blocks: HydratedBlock[];
  source: BlocksSource;
  fallback_reason: FallbackReason;
  derived_block_hashes_count: number;
  hydrated_blocks_count: number;
  error?: string;
  error_code?: string;
  detail?: string;
  meta: {
    rpc_base: string;
    ts: number;
    limit_requested: number;
    primary_endpoint_status?: number;
    txs_scanned?: number;
    blocks_failed?: number;
  };
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

const MAX_BLOCKS = 25;
const MAX_TX_SCAN = 200;
const CONCURRENCY_CAP = 8;

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Hydrate a single block by hash
 */
async function hydrateBlock(blockHash: string): Promise<HydratedBlock> {
  // Try /block/:hash first
  let result = await proxyRpcRequest(`/block/${encodeURIComponent(blockHash)}`, {
    timeout: 3000,
  });

  // Fallback to /blocks/:hash
  if (!result.ok && result.status_code === 404) {
    result = await proxyRpcRequest(`/blocks/${encodeURIComponent(blockHash)}`, {
      timeout: 3000,
    });
  }

  if (!result.ok || !result.data) {
    return {
      block_hash: blockHash,
      _hydration_failed: true,
      _hydration_error: result.detail || result.error || "Failed to fetch block",
    };
  }

  const data = result.data as Record<string, unknown>;
  
  // Handle nested { block: {...} } or flat structure
  const block = (data.block as Record<string, unknown>) || data;
  const header = block.header as Record<string, unknown> | undefined;

  return {
    block_hash: blockHash,
    prev_block_hash: 
      (header?.prev_block_hash as string) ||
      (block.prev_block_hash as string) ||
      (block.parent_hash as string),
    round_id: (block.round_id as number | string) || (header?.round_id as number | string),
    hashtimer: (block.hash_timer_id as string) || (block.hashtimer as string) || (header?.hash_timer_id as string),
    hash_timer_id: (block.hash_timer_id as string) || (header?.hash_timer_id as string),
    tx_count: 
      (block.tx_count as number) ||
      (Array.isArray(block.tx_ids) ? block.tx_ids.length : undefined) ||
      (Array.isArray(block.transactions) ? block.transactions.length : undefined),
    tx_ids: Array.isArray(block.tx_ids) ? block.tx_ids : undefined,
    timestamp: (block.timestamp as string) || (header?.timestamp as string),
    ippan_time_ms: (block.ippan_time_ms as number) || (header?.ippan_time_ms as number),
    header: header,
  };
}

/**
 * Hydrate blocks with concurrency limit
 */
async function hydrateBlocksConcurrently(
  blockHashes: string[],
  concurrency: number
): Promise<HydratedBlock[]> {
  const results: HydratedBlock[] = [];
  const queue = [...blockHashes];

  async function worker() {
    while (queue.length > 0) {
      const hash = queue.shift();
      if (hash) {
        const block = await hydrateBlock(hash);
        results.push(block);
      }
    }
  }

  const workers = Array(Math.min(concurrency, queue.length))
    .fill(null)
    .map(() => worker());

  await Promise.all(workers);

  // Sort by discovery order (preserve order from tx list)
  const hashOrder = new Map(blockHashes.map((h, i) => [h, i]));
  results.sort((a, b) => (hashOrder.get(a.block_hash) ?? 0) - (hashOrder.get(b.block_hash) ?? 0));

  return results;
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * Get blocks with fallback logic.
 * 
 * This is the SHARED function used by both:
 * - `/api/rpc/blocks` route (for client polling)
 * - `/blocks` SSR page (for server rendering)
 * 
 * Flow:
 * A) Try upstream /blocks?limit=N
 *    - If 200 with blocks → return normalized
 *    - If 404 or empty → fallback
 * 
 * B) Fallback: derive blocks from tx history
 *    - Call /tx/recent?limit=200
 *    - Collect unique included.block_hash (Included/Finalized only)
 *    - Take first N (max 25)
 *    - Hydrate each via /block/<hash>
 *    - Return normalized list
 */
export async function getBlocksWithFallback(
  limit: number = MAX_BLOCKS
): Promise<BlocksApiResponse> {
  const effectiveLimit = Math.min(Math.max(1, limit), MAX_BLOCKS);
  const ts = Date.now();
  const rpcBase = getServerRpcBase();
  const warnings: string[] = [];

  console.log(`[blocksService] getBlocksWithFallback(${effectiveLimit}) - rpcBase: ${rpcBase}`);

  // Try primary endpoint first
  const primaryResult = await proxyRpcRequest(`/blocks?limit=${effectiveLimit}`, { timeout: 5000 });

  // Determine if primary is available and why fallback might be needed
  const primaryStatusCode = primaryResult.status_code;
  const primaryIs404 = primaryStatusCode === 404;
  const primaryFailed = !primaryResult.ok;

  console.log(`[blocksService] Primary /blocks result: ok=${primaryResult.ok}, status=${primaryStatusCode}`);

  if (primaryResult.ok && primaryResult.data) {
    // Primary endpoint succeeded
    const data = primaryResult.data as Record<string, unknown>;
    const rawBlocks: unknown[] = Array.isArray(data) 
      ? data 
      : Array.isArray(data.blocks) 
        ? data.blocks 
        : [];

    // If primary returns empty, trigger fallback instead of returning empty
    // This handles gateways that return 200 OK with [] instead of actual blocks
    if (rawBlocks.length === 0) {
      warnings.push("Primary /blocks returned 200 but with empty array, using tx-derived fallback");
      console.log("[blocksService] Primary returned empty, falling back to tx-derived");
      // Fall through to fallback logic below
    } else {
      // Normalize blocks from primary endpoint
      const blocks: HydratedBlock[] = rawBlocks.map((b: unknown) => {
        const block = b as Record<string, unknown>;
        const header = block.header as Record<string, unknown> | undefined;
        
        return {
          block_hash: (block.block_hash as string) || (block.hash as string) || (block.id as string) || "",
          prev_block_hash: (header?.prev_block_hash as string) || (block.prev_block_hash as string),
          round_id: (block.round_id as number | string) || (header?.round_id as number | string),
          hashtimer: (block.hash_timer_id as string) || (block.hashtimer as string),
          tx_count: 
            (block.tx_count as number) ||
            (Array.isArray(block.tx_ids) ? block.tx_ids.length : undefined),
          timestamp: (block.timestamp as string) || (header?.timestamp as string),
          ippan_time_ms: (block.ippan_time_ms as number) || (header?.ippan_time_ms as number),
        };
      });

      console.log(`[blocksService] Primary returned ${blocks.length} blocks`);

      return {
        ok: true,
        blocks,
        source: "upstream_blocks",
        fallback_reason: null,
        derived_block_hashes_count: 0,
        hydrated_blocks_count: blocks.length,
        meta: {
          rpc_base: rpcBase,
          ts,
          limit_requested: effectiveLimit,
          primary_endpoint_status: primaryStatusCode,
        },
        warnings,
      };
    }
    // else: rawBlocks.length === 0, fall through to fallback below
  }

  // Primary failed OR returned empty - determine reason and use fallback
  const primaryReturnedEmpty = primaryResult.ok && primaryResult.data;
  const fallbackReason: FallbackReason = primaryReturnedEmpty
    ? "blocks_empty"
    : primaryIs404 
      ? "blocks_404" 
      : primaryFailed 
        ? "blocks_error" 
        : null;

  if (!primaryReturnedEmpty) {
    warnings.push(
      primaryIs404 
        ? "Primary /blocks endpoint returns 404 (not implemented), using tx-derived fallback"
        : `Primary /blocks endpoint failed (${primaryResult.detail || primaryResult.error}), using tx-derived fallback`
    );
  }

  console.log(`[blocksService] Using fallback, reason: ${fallbackReason}`);

  // Fallback: derive blocks from recent transactions
  const txResult = await proxyRpcRequest(`/tx/recent?limit=${MAX_TX_SCAN}`, { timeout: 8000 });

  if (!txResult.ok || !txResult.data) {
    // Both primary and fallback failed - return informative error
    console.log(`[blocksService] Fallback also failed: ${txResult.detail || txResult.error}`);
    
    return {
      ok: false,
      blocks: [],
      source: "fallback_tx_recent",
      fallback_reason: fallbackReason,
      derived_block_hashes_count: 0,
      hydrated_blocks_count: 0,
      error: "blocks_unavailable",
      error_code: "FALLBACK_FAILED",
      detail: "Neither /blocks nor /tx/recent endpoints are available",
      meta: {
        rpc_base: rpcBase,
        ts,
        limit_requested: effectiveLimit,
        primary_endpoint_status: primaryStatusCode,
      },
      warnings: [
        ...warnings,
        `Fallback /tx/recent also failed: ${txResult.detail || txResult.error}`,
      ],
    };
  }

  // Parse transaction list (accept various formats)
  const txData = txResult.data as Record<string, unknown>;
  const txList: TxRecentItem[] = Array.isArray(txData)
    ? txData
    : Array.isArray(txData.items)
      ? txData.items
      : Array.isArray(txData.txs)
        ? txData.txs
        : [];

  console.log(`[blocksService] Got ${txList.length} transactions from /tx/recent`);

  if (txList.length === 0) {
    return {
      ok: true,
      blocks: [],
      source: "fallback_tx_recent",
      fallback_reason: fallbackReason,
      derived_block_hashes_count: 0,
      hydrated_blocks_count: 0,
      meta: {
        rpc_base: rpcBase,
        ts,
        limit_requested: effectiveLimit,
        primary_endpoint_status: primaryStatusCode,
        txs_scanned: 0,
      },
      warnings: [
        ...warnings,
        "No transactions found in /tx/recent, so no blocks to derive",
      ],
    };
  }

  // Extract unique block hashes from finalized/included transactions
  const blockHashes = new Set<string>();
  for (const tx of txList) {
    const status = tx.status_v2 || tx.status || "";
    const statusLower = status.toLowerCase();
    
    // Only include transactions that have been included in a block
    if (statusLower === "included" || statusLower === "finalized") {
      const blockHash = tx.included?.block_hash || tx.block_hash;
      if (blockHash && typeof blockHash === "string") {
        blockHashes.add(blockHash);
      }
    }
    
    // Stop if we have enough
    if (blockHashes.size >= effectiveLimit) break;
  }

  const uniqueHashes = Array.from(blockHashes).slice(0, effectiveLimit);
  console.log(`[blocksService] Derived ${uniqueHashes.length} unique block hashes from txs`);

  if (uniqueHashes.length === 0) {
    return {
      ok: true,
      blocks: [],
      source: "fallback_tx_recent",
      fallback_reason: fallbackReason,
      derived_block_hashes_count: 0,
      hydrated_blocks_count: 0,
      meta: {
        rpc_base: rpcBase,
        ts,
        limit_requested: effectiveLimit,
        primary_endpoint_status: primaryStatusCode,
        txs_scanned: txList.length,
      },
      warnings: [
        ...warnings,
        `Scanned ${txList.length} transactions but none had included/finalized status with block hashes`,
      ],
    };
  }

  // Hydrate blocks in parallel with concurrency limit
  const hydratedBlocks = await hydrateBlocksConcurrently(uniqueHashes, CONCURRENCY_CAP);

  // Separate successful and failed blocks
  const successfulBlocks = hydratedBlocks.filter(b => !b._hydration_failed);
  const failedBlocks = hydratedBlocks.filter(b => b._hydration_failed);

  if (failedBlocks.length > 0) {
    warnings.push(`${failedBlocks.length} of ${uniqueHashes.length} blocks failed to hydrate`);
  }

  // Sort by ippan_time_ms (newest first) if available, otherwise keep discovery order
  successfulBlocks.sort((a, b) => {
    if (a.ippan_time_ms && b.ippan_time_ms) {
      return b.ippan_time_ms - a.ippan_time_ms;
    }
    return 0;
  });

  console.log(`[blocksService] Successfully hydrated ${successfulBlocks.length} blocks`);

  return {
    ok: true,
    blocks: successfulBlocks,
    source: "fallback_tx_recent",
    fallback_reason: fallbackReason,
    derived_block_hashes_count: uniqueHashes.length,
    hydrated_blocks_count: successfulBlocks.length,
    meta: {
      rpc_base: rpcBase,
      ts,
      limit_requested: effectiveLimit,
      primary_endpoint_status: primaryStatusCode,
      txs_scanned: txList.length,
      blocks_failed: failedBlocks.length,
    },
    warnings,
  };
}
