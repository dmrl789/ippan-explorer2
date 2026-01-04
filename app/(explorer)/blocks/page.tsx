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

interface BlocksResponse {
  ok: boolean;
  data?: BlockSummary[];
  error?: string;
  error_code?: string;
  detail?: string;
  meta?: Record<string, unknown>;
  warnings?: string[];
}

export default function BlocksPage() {
  const router = useRouter();
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [source, setSource] = useState<"live" | "error">("live");
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch blocks
  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/rpc/blocks?limit=25", {
        cache: "no-store",
      });

      const data: BlocksResponse = await res.json();

      if (data.ok && data.data) {
        // Normalize the response data
        const normalizedBlocks = (Array.isArray(data.data) ? data.data : []).map(normalizeBlock);
        setBlocks(normalizedBlocks);
        setSource("live");
        setMeta(data.meta || null);
        setWarnings(data.warnings || []);
      } else {
        setError(data.detail || data.error || "Failed to fetch blocks");
        setErrorCode(data.error_code);
        setSource("error");
        setBlocks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setErrorCode("FETCH_ERROR");
      setSource("error");
      setBlocks([]);
    } finally {
      setLoading(false);
    }
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

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
          <p className="text-xs font-medium text-amber-300 mb-1">Fallback Mode Active</p>
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
            errorCode,
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
          emptyMessage="No blocks yet"
          emptyDescription="The DevNet may not have any blocks recorded yet, or the block list endpoint may not be available."
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
                  {block.ippan_time_ms 
                    ? new Date(block.ippan_time_ms).toLocaleString()
                    : block.timestamp 
                      ? new Date(block.timestamp).toLocaleString()
                      : "—"}
                </span>
              ),
            },
          ]}
        />
      </Card>

      {/* Meta info */}
      {meta && (
        <JsonPanel data={meta} title="Response Metadata" />
      )}
    </div>
  );
}

// Normalize API response to BlockSummary
function normalizeBlock(raw: unknown): BlockSummary {
  if (!raw || typeof raw !== "object") {
    return { block_hash: "" };
  }

  const item = raw as Record<string, unknown>;
  const header = item.header as Record<string, unknown> | undefined;

  return {
    block_hash:
      (item.block_hash as string) ??
      (item.hash as string) ??
      (header?.block_hash as string) ??
      (item.id as string) ??
      "",
    prev_block_hash:
      (header?.prev_block_hash as string) ??
      (item.prev_block_hash as string) ??
      (item.parent_hash as string),
    round_id:
      (item.round_id as number | string) ??
      (header?.round_id as number | string),
    hashtimer:
      (item.hash_timer_id as string) ??
      (item.hashtimer as string) ??
      (header?.hash_timer_id as string),
    tx_count:
      (item.tx_count as number) ??
      (Array.isArray(item.tx_ids) ? item.tx_ids.length : undefined) ??
      (Array.isArray(item.transactions) ? item.transactions.length : undefined),
    timestamp:
      (item.timestamp as string) ??
      (header?.timestamp as string),
    ippan_time_ms:
      (item.ippan_time_ms as number) ??
      (header?.ippan_time_ms as number),
  };
}
