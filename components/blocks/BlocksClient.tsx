"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toMs } from "@/lib/time";

type BlockRow = {
  block_hash: string;
  tx_count?: number;
  timestamp?: number | string;
  round_id?: number | string;
  prev_block_hash?: string;
  ippan_time_ms?: number;
};

export type BlocksApiResponse = {
  ok: boolean;
  blocks: BlockRow[];
  source?: string;
  fallback_reason?: string | null;
  warnings?: string[];
  derived_block_hashes_count?: number;
  hydrated_blocks_count?: number;
};

/**
 * Parse blocks API response - handles BOTH envelope and plain formats.
 * 
 * Envelope format: { ok, data: { ok, blocks: [...] } }
 * Plain format:    { ok, blocks: [...] }
 */
function parseBlocksResponse(json: unknown): BlocksApiResponse | null {
  if (!json || typeof json !== "object") {
    console.warn("[BlocksClient] Response is not an object:", json);
    return null;
  }
  
  const obj = json as Record<string, unknown>;
  
  // Envelope format: unwrap { data: { blocks: [...] } }
  if ("data" in obj && obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;
    if (Array.isArray(data.blocks)) {
      console.log("[BlocksClient] Parsed envelope format, blocks:", data.blocks?.length);
      return {
        ok: data.ok !== false,
        blocks: data.blocks as BlockRow[],
        source: data.source as string | undefined,
        fallback_reason: data.fallback_reason as string | null | undefined,
        warnings: data.warnings as string[] | undefined,
      };
    }
  }
  
  // Plain format: { ok, blocks: [...] }
  if (Array.isArray(obj.blocks)) {
    console.log("[BlocksClient] Parsed plain format, blocks:", obj.blocks?.length);
    return {
      ok: obj.ok !== false,
      blocks: obj.blocks as BlockRow[],
      source: obj.source as string | undefined,
      fallback_reason: obj.fallback_reason as string | null | undefined,
      warnings: obj.warnings as string[] | undefined,
    };
  }
  
  console.warn("[BlocksClient] Could not parse response, no blocks array found:", Object.keys(obj));
  return null;
}

function shortenHash(hash: string, len = 8): string {
  if (!hash || hash.length <= len * 2) return hash || "—";
  return `${hash.slice(0, len)}…${hash.slice(-len)}`;
}

interface BlocksClientProps {
  initial: BlocksApiResponse | null;
}

export default function BlocksClient({ initial }: BlocksClientProps) {
  const [data, setData] = useState<BlocksApiResponse | null>(initial);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(!initial);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const res = await fetch("/api/rpc/blocks?limit=25", { cache: "no-store" });
      
      // IMPORTANT: always parse JSON, even on error responses
      let json: unknown;
      try {
        json = await res.json();
      } catch (parseErr) {
        throw new Error(`JSON parse error: ${parseErr}`);
      }

      // Check HTTP status first
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Parse the response (handles both envelope and plain formats)
      const payload = parseBlocksResponse(json);

      // Validate the payload structure
      if (!payload) {
        throw new Error("Could not parse blocks response");
      }
      if (!payload.ok) {
        throw new Error("API returned ok: false");
      }
      if (!Array.isArray(payload.blocks)) {
        throw new Error("payload.blocks is not an array");
      }

      // Success! Update data
      setData(payload);
      setRefreshError(null);
      console.log("[BlocksClient] Refresh success, got", payload.blocks.length, "blocks");
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : "unknown error";
      console.error("[BlocksClient] Refresh error:", errorMsg);
      // IMPORTANT: do NOT wipe existing data; just show a warning banner
      setRefreshError(errorMsg);
    } finally {
      // THIS is critical: ALWAYS exit loading state, even on error
      setIsRefreshing(false);
      setIsInitialLoad(false);
    }
  }, []);

  // Initial refresh on mount + auto-refresh interval
  useEffect(() => {
    // If SSR already provided data, we still refresh once to confirm
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  const blocks = data?.blocks ?? [];
  const isFallback = data?.source === "fallback_tx_recent";

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
          />
          Auto-refresh
        </label>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100 disabled:opacity-50"
        >
          {isRefreshing ? "Refreshing..." : "Refresh"}
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

      {/* Refresh error banner - doesn't wipe data */}
      {refreshError && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
          <p className="text-xs font-medium text-amber-300">Auto-refresh failed</p>
          <p className="text-xs text-amber-200/70">{refreshError}</p>
        </div>
      )}

      {/* Fallback mode notice */}
      {isFallback && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚠️</span>
            <p className="text-xs font-medium text-amber-300">
              {data?.fallback_reason === "blocks_404"
                ? "Node doesn't expose /blocks endpoint"
                : "Using tx-derived blocks (fallback mode)"}
            </p>
          </div>
          {data?.warnings?.[0] && (
            <p className="text-xs text-amber-200/70 mt-1">{data.warnings[0]}</p>
          )}
        </div>
      )}

      {/* Other warnings */}
      {!isFallback && data?.warnings && data.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
          <p className="text-xs font-medium text-amber-300 mb-1">Warnings</p>
          {data.warnings.map((w, i) => (
            <p key={i} className="text-xs text-amber-200/70">{w}</p>
          ))}
        </div>
      )}

      {/* Blocks table */}
      <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-slate-800/50">
          <span className="text-sm font-semibold text-slate-100">Recent Blocks</span>
          <span className="text-xs text-slate-500">{blocks.length} blocks</span>
        </div>

        {blocks.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">
            {isInitialLoad && isRefreshing
              ? "Loading blocks..."
              : refreshError
                ? `Error: ${refreshError}`
                : "No blocks available"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Hash</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500 hidden sm:table-cell">Parent</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Round</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Txs</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500 hidden md:table-cell">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {blocks.map((block) => {
                  // Handle timestamp as string or number (API may return either)
                  const ts = typeof block.timestamp === "string" 
                    ? parseInt(block.timestamp, 10) 
                    : block.timestamp;
                  const tsMs = toMs(ts);
                  return (
                    <tr key={block.block_hash} className="hover:bg-slate-900/30">
                      <td className="px-4 py-2">
                        <Link
                          href={`/blocks/${block.block_hash}`}
                          className="font-mono text-xs text-emerald-300 hover:text-emerald-200"
                        >
                          {shortenHash(block.block_hash, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-2 hidden sm:table-cell">
                        {block.prev_block_hash ? (
                          <Link
                            href={`/blocks/${block.prev_block_hash}`}
                            className="font-mono text-xs text-slate-400 hover:text-slate-200"
                          >
                            {shortenHash(block.prev_block_hash, 6)}
                          </Link>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate-400">{block.round_id ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-300 font-semibold">{block.tx_count ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-500 text-xs hidden md:table-cell">
                        {tsMs ? new Date(tsMs).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
