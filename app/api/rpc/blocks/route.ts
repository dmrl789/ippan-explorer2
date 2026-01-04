import { NextRequest, NextResponse } from "next/server";
import { proxyRpcRequest, getServerRpcBase } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_BLOCKS = 25;
const MAX_TX_SCAN = 200;
const CONCURRENCY_CAP = 8;

interface TxRecentItem {
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

interface HydratedBlock {
  block_hash: string;
  prev_block_hash?: string;
  round_id?: number | string;
  hashtimer?: string;
  hash_timer_id?: string;
  tx_count?: number;
  tx_ids?: string[];
  timestamp?: string;
  ippan_time_ms?: number;
  header?: Record<string, unknown>;
  _hydration_failed?: boolean;
  _hydration_error?: string;
}

/**
 * Hydrate a single block by hash with concurrency control
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

/**
 * GET /api/rpc/blocks
 * 
 * Returns a list of recent blocks with robust fallback:
 * 
 * A) Try upstream /blocks?limit=N
 *    - If 200 → return normalized
 *    - If 404 → fallback
 * 
 * B) Fallback: derive blocks from tx history
 *    - Call /tx/recent?limit=200
 *    - Collect unique included.block_hash (Included/Finalized only)
 *    - Take first N (max 25)
 *    - Hydrate each via /block/<hash>
 *    - Return normalized list
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit") || String(MAX_BLOCKS);
  const limit = Math.min(parseInt(limitParam, 10) || MAX_BLOCKS, MAX_BLOCKS);
  
  const ts = Date.now();
  const rpcBase = getServerRpcBase();
  const warnings: string[] = [];

  // Try primary endpoint first
  const primaryResult = await proxyRpcRequest(`/blocks?limit=${limit}`, { timeout: 5000 });

  if (primaryResult.ok && primaryResult.data) {
    // Primary endpoint succeeded
    const data = primaryResult.data as Record<string, unknown>;
    const rawBlocks: unknown[] = Array.isArray(data) 
      ? data 
      : Array.isArray(data.blocks) 
        ? data.blocks 
        : [];

    // Normalize blocks from primary endpoint
    const blocks = rawBlocks.map((b: unknown) => {
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

    return NextResponse.json({
      ok: true,
      data: blocks,
      meta: {
        source: "primary",
        endpoint: "/blocks",
        count: blocks.length,
        rpc_base: rpcBase,
        ts,
      },
      warnings,
    });
  }

  // Primary failed (likely 404) - use fallback
  warnings.push("Primary /blocks endpoint unavailable, using tx-derived fallback");

  // Fallback: derive blocks from recent transactions
  const txResult = await proxyRpcRequest(`/tx/recent?limit=${MAX_TX_SCAN}`, { timeout: 8000 });

  if (!txResult.ok || !txResult.data) {
    return NextResponse.json({
      ok: false,
      error: "blocks_unavailable",
      error_code: "FALLBACK_FAILED",
      detail: "Neither /blocks nor /tx/recent endpoints are available",
      rpc_base: rpcBase,
      path: "/blocks",
      ts,
      warnings,
      primary_error: primaryResult.detail || primaryResult.error,
      fallback_error: txResult.detail || txResult.error,
    }, { status: 502 });
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

  if (txList.length === 0) {
    return NextResponse.json({
      ok: true,
      data: [],
      meta: {
        source: "fallback_empty",
        endpoint: "/tx/recent",
        count: 0,
        rpc_base: rpcBase,
        ts,
        note: "No transactions found, so no blocks to derive",
      },
      warnings,
    });
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
    if (blockHashes.size >= limit) break;
  }

  const uniqueHashes = Array.from(blockHashes).slice(0, limit);

  if (uniqueHashes.length === 0) {
    return NextResponse.json({
      ok: true,
      data: [],
      meta: {
        source: "fallback_no_blocks",
        endpoint: "/tx/recent",
        count: 0,
        txs_scanned: txList.length,
        rpc_base: rpcBase,
        ts,
        note: "No included/finalized transactions with block hashes found",
      },
      warnings,
    });
  }

  // Hydrate blocks in parallel with concurrency limit
  const hydratedBlocks = await hydrateBlocksConcurrently(uniqueHashes, CONCURRENCY_CAP);

  // Separate successful and failed blocks
  const successfulBlocks = hydratedBlocks.filter(b => !b._hydration_failed);
  const failedBlocks = hydratedBlocks.filter(b => b._hydration_failed);

  if (failedBlocks.length > 0) {
    warnings.push(`${failedBlocks.length} blocks failed to hydrate`);
  }

  // Sort by ippan_time_ms (newest first) if available, otherwise keep discovery order
  successfulBlocks.sort((a, b) => {
    if (a.ippan_time_ms && b.ippan_time_ms) {
      return b.ippan_time_ms - a.ippan_time_ms;
    }
    return 0;
  });

  return NextResponse.json({
    ok: true,
    data: successfulBlocks,
    meta: {
      source: "fallback_tx_derived",
      endpoint: "/tx/recent",
      count: successfulBlocks.length,
      txs_scanned: txList.length,
      blocks_attempted: uniqueHashes.length,
      blocks_failed: failedBlocks.length,
      rpc_base: rpcBase,
      ts,
    },
    warnings,
    failed_blocks: failedBlocks.length > 0 ? failedBlocks : undefined,
  });
}
