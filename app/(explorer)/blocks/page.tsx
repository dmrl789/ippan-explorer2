import BlocksClient from "@/components/blocks/BlocksClient";
import { getBlocksWithFallback, type BlocksApiResponse } from "@/lib/blocksService";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { toMs } from "@/lib/time";

// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

function shortenHash(hash: string, len = 8): string {
  if (!hash || hash.length <= len * 2) return hash || "—";
  return `${hash.slice(0, len)}…${hash.slice(-len)}`;
}

/**
 * SSR Block List - Renders blocks directly in server HTML.
 * This ensures content is visible even if client JS fails to hydrate.
 */
function SSRBlockList({ blocks }: { blocks: BlocksApiResponse["blocks"] }) {
  if (!blocks || blocks.length === 0) {
    return (
      <noscript>
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-sm text-slate-400">
          No blocks available (SSR). Enable JavaScript for auto-refresh.
        </div>
      </noscript>
    );
  }

  return (
    <noscript>
      <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-slate-800/50">
          <span className="text-sm font-semibold text-slate-100">Recent Blocks (SSR)</span>
          <span className="text-xs text-slate-500">{blocks.length} blocks</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr className="border-b border-slate-800">
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Hash</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Round</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Txs</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {blocks.map((block) => {
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
                    <td className="px-4 py-2 text-slate-400">{block.round_id ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-300 font-semibold">{block.tx_count ?? "—"}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">
                      {tsMs ? new Date(tsMs).toISOString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-800/50 text-xs text-slate-500">
          Enable JavaScript for auto-refresh and full functionality.
        </div>
      </div>
    </noscript>
  );
}

/**
 * Blocks page with SSR initial data.
 * 
 * KEY FIX: This page now calls getBlocksWithFallback() DIRECTLY instead of
 * fetching via HTTP to /api/rpc/blocks. This eliminates the "fetch myself
 * over HTTP" problem that causes SSR to fail on Vercel serverless.
 * 
 * The page renders blocks immediately from SSR, then the client component
 * takes over for auto-refresh polling.
 */
export default async function BlocksPage() {
  console.log("[BlocksPage] SSR: calling getBlocksWithFallback directly (no HTTP self-fetch)");
  
  let initial: BlocksApiResponse | null = null;
  
  try {
    initial = await getBlocksWithFallback(25);
    console.log(`[BlocksPage] SSR: got ${initial.blocks?.length ?? 0} blocks (${initial.source})`);
  } catch (err) {
    console.error("[BlocksPage] SSR: getBlocksWithFallback error:", err);
  }

  // Convert to client-compatible format (the client component expects a simpler type)
  const clientInitial = initial ? {
    ok: initial.ok,
    blocks: initial.blocks.map(b => ({
      block_hash: b.block_hash,
      prev_block_hash: b.prev_block_hash,
      round_id: b.round_id,
      tx_count: b.tx_count,
      timestamp: b.timestamp,
      ippan_time_ms: b.ippan_time_ms,
    })),
    source: initial.source,
    fallback_reason: initial.fallback_reason,
    warnings: initial.warnings,
  } : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blocks"
        description="Latest blocks from DevNet"
      />
      
      {/* SSR debug info - always show for debugging */}
      <div className="text-xs text-slate-600 font-mono">
        SSR: {initial ? `${initial.blocks?.length ?? 0} blocks` : "no data"} 
        {initial?.source ? ` (${initial.source})` : ""}
        {initial?.fallback_reason ? ` [${initial.fallback_reason}]` : ""}
      </div>
      
      {/* SSR fallback for no-JS environments */}
      <SSRBlockList blocks={initial?.blocks ?? []} />
      
      {/* Client component for interactive features */}
      <BlocksClient initial={clientInitial} />
    </div>
  );
}
