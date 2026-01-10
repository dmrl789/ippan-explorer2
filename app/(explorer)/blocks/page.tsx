"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { RpcErrorBanner } from "@/components/common/RpcErrorBanner";
import { ResponsiveTable } from "@/components/common/ResponsiveTable";
import { HashCell, HashCellCompact } from "@/components/common/HashCell";
import { JsonPanel } from "@/components/common/JsonPanel";
import { type BlockSummary } from "@/lib/normalize";
import { shortenHash } from "@/lib/format";
import { IPPAN_RPC_BASE } from "@/lib/rpc";
import { fetchProxy, toMs } from "@/lib/clientFetch";

// Response type matching the plain /blocks API format
interface BlocksApiResponse {
  ok: boolean;
  blocks: Array<{
    block_hash: string;
    tx_count?: number;
    timestamp?: number;
    round_id?: number | string;
    prev_block_hash?: string;
    hash_timer_id?: string;
  }>;
  source?: string;
  fallback_reason?: string | null;
  derived_block_hashes_count?: number;
  hydrated_blocks_count?: number;
  warnings?: string[];
  meta?: Record<string, unknown>;
}

export default function BlocksPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "error">("live");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");
  
  // Enhanced debug state
  const [blocksSource, setBlocksSource] = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // Fetch blocks using the simplified client fetch helper
  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDebugInfo("Fetching /api/rpc/blocks...");

    const result = await fetchProxy<BlocksApiResponse>("/blocks?limit=25");
    
    setDebugInfo(`Fetch complete: ok=${result.ok}, hasData=${!!result.data}`);

    if (!result.ok) {
      setError(result.error);
      setSource("error");
      setBlocks([]);
      setLoading(false);
      return;
    }

    const data = result.data;
    
    // Extract blocks from the plain response format
    const rawBlocks = data.blocks ?? [];
    setDebugInfo(`Got ${rawBlocks.length} blocks`);
    
    // Extract debug info
    setBlocksSource(data.source ?? null);
    setFallbackReason(data.fallback_reason ?? null);
    setWarnings(data.warnings ?? []);

    // Normalize blocks
    const normalizedBlocks = rawBlocks.map((b): BlockSummary => ({
      block_hash: b.block_hash ?? "",
      tx_count: b.tx_count,
      timestamp: b.timestamp?.toString(),
      ippan_time_ms: toMs(b.timestamp) ?? undefined,
      round_id: b.round_id,
      prev_block_hash: b.prev_block_hash,
      hashtimer: b.hash_timer_id,
    }));

    setBlocks(normalizedBlocks);
    setSource("live");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(fetchBlocks, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchBlocks]);

  const handleRowClick = (block: BlockSummary) => {
    if (block.block_hash) {
      router.push(`/blocks/${block.block_hash}`);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blocks"
        description="Latest blocks from DevNet"
        actions={
          <div className="flex items-center gap-2">
            {/* Auto-refresh toggle (hidden on mobile) */}
            <label className="hidden sm:flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
              />
              Auto-refresh
            </label>
            <button
              onClick={fetchBlocks}
              disabled={loading}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <a
              href="/api/rpc/debug"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
            >
              Debug RPC
            </a>
          </div>
        }
      />

      {/* Debug Info (dev only) */}
      {process.env.NODE_ENV !== "production" && debugInfo && (
        <div className="text-xs text-slate-500 font-mono">{debugInfo}</div>
      )}

      {/* Fallback Mode Notice */}
      {blocksSource === "fallback_tx_recent" && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚠️</span>
            <p className="text-xs font-medium text-amber-300">
              {fallbackReason === "blocks_404" 
                ? "Node doesn't expose /blocks endpoint"
                : "Using tx-derived blocks (fallback mode)"}
            </p>
          </div>
          <p className="text-xs text-amber-200/70">
            {warnings[0] || "Blocks are derived from recent transactions."}
          </p>
        </div>
      )}

      {/* Other Warnings */}
      {blocksSource !== "fallback_tx_recent" && warnings.length > 0 && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
          <p className="text-xs font-medium text-amber-300 mb-1">Warnings</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-200/70">{w}</p>
          ))}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <RpcErrorBanner
          error={{
            error,
            rpcBase: IPPAN_RPC_BASE,
            path: "/blocks",
          }}
          context="Blocks"
          showDebugLink={true}
        />
      )}

      {/* Blocks List */}
      <Card
        title="Recent Blocks"
        headerSlot={<SourceBadge source={source} />}
      >
        <ResponsiveTable
          data={blocks}
          loading={loading}
          keyExtractor={(block) => block.block_hash}
          emptyMessage={
            fallbackReason === "blocks_404" && hydratedCount === 0
              ? "No blocks derived yet"
              : "No blocks yet"
          }
          emptyDescription={
            fallbackReason === "blocks_404"
              ? hydratedCount === 0
                ? "Node doesn't expose /blocks. No recent transactions with block hashes found to derive blocks from."
                : "Using tx-derived blocks fallback."
              : "The DevNet may not have any blocks recorded yet, or the block list endpoint may not be available."
          }
          onRowClick={handleRowClick}
          columns={[
            {
              key: "block_hash",
              header: "Block Hash",
              mobilePriority: 1,
              render: (block) => (
                <Link
                  href={`/blocks/${block.block_hash}`}
                  className="text-emerald-300 hover:text-emerald-200 font-mono text-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {shortenHash(block.block_hash, 8)}
                </Link>
              ),
              renderMobile: (block) => (
                <HashCellCompact value={block.block_hash} href={`/blocks/${block.block_hash}`} />
              ),
            },
            {
              key: "prev_block_hash",
              header: "Parent",
              mobilePriority: 5,
              hideOnMobile: true,
              render: (block) => {
                if (!block.prev_block_hash) {
                  return <span className="text-slate-500">—</span>;
                }
                return (
                  <Link
                    href={`/blocks/${block.prev_block_hash}`}
                    className="text-slate-400 hover:text-slate-200 font-mono text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {shortenHash(block.prev_block_hash, 6)}
                  </Link>
                );
              },
            },
            {
              key: "hashtimer",
              header: "HashTimer",
              mobilePriority: 4,
              hideOnMobile: true,
              render: (block) => (
                <span className="text-slate-400 font-mono text-xs">
                  {block.hashtimer ? shortenHash(block.hashtimer, 6) : "—"}
                </span>
              ),
            },
            {
              key: "round_id",
              header: "Round",
              mobilePriority: 2,
              render: (block) => (
                <span className="text-slate-400 text-sm">
                  {block.round_id ?? "—"}
                </span>
              ),
            },
            {
              key: "tx_count",
              header: "Txs",
              mobilePriority: 3,
              render: (block) => (
                <span className="text-slate-300 font-semibold">
                  {block.tx_count ?? "—"}
                </span>
              ),
            },
            {
              key: "timestamp",
              header: "Time",
              mobilePriority: 6,
              hideOnMobile: true,
              render: (block) => (
                <span className="text-slate-500 text-xs">
                  {block.ippan_time_ms ? new Date(block.ippan_time_ms).toLocaleString() : "—"}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
