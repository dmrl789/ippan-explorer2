import BlocksClient, { type BlocksApiResponse } from "@/components/blocks/BlocksClient";
import { getServerOrigin } from "@/lib/serverOrigin";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { toMs } from "@/lib/time";

// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Parse blocks response - handles BOTH envelope and plain formats.
 * 
 * Envelope format: { ok, data: { ok, blocks: [...] } }
 * Plain format:    { ok, blocks: [...] }
 */
function parseBlocksResponse(json: unknown): BlocksApiResponse | null {
  if (!json || typeof json !== "object") {
    console.error("[SSR] Response is not an object");
    return null;
  }
  
  const obj = json as Record<string, unknown>;
  
  // Envelope format: unwrap { data: { blocks: [...] } }
  if ("data" in obj && obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;
    if (Array.isArray(data.blocks)) {
      console.log("[SSR] Parsed envelope format, blocks:", data.blocks?.length);
      return {
        ok: data.ok !== false,
        blocks: data.blocks as BlocksApiResponse["blocks"],
        source: data.source as string | undefined,
        fallback_reason: data.fallback_reason as string | null | undefined,
        warnings: data.warnings as string[] | undefined,
      };
    }
  }
  
  // Plain format: { ok, blocks: [...] }
  if (Array.isArray(obj.blocks)) {
    console.log("[SSR] Parsed plain format, blocks:", obj.blocks?.length);
    return {
      ok: obj.ok !== false,
      blocks: obj.blocks as BlocksApiResponse["blocks"],
      source: obj.source as string | undefined,
      fallback_reason: obj.fallback_reason as string | null | undefined,
      warnings: obj.warnings as string[] | undefined,
    };
  }
  
  console.error("[SSR] Could not parse response, no blocks array found");
  return null;
}

/**
 * Fetch initial blocks data on the server.
 * This ensures the page shows content even before client JS hydrates.
 */
async function getInitialBlocks(): Promise<BlocksApiResponse | null> {
  try {
    const origin = getServerOrigin();
    const url = `${origin}/api/rpc/blocks?limit=25`;
    console.log("[SSR] Fetching blocks from:", url);
    
    const res = await fetch(url, {
      cache: "no-store",
      next: { revalidate: 0 },
    });
    
    if (!res.ok) {
      console.error(`[SSR] Blocks fetch failed: HTTP ${res.status}`);
      return null;
    }
    
    const json = await res.json();
    const parsed = parseBlocksResponse(json);
    
    if (!parsed) {
      console.error("[SSR] Blocks response could not be parsed");
      return null;
    }
    
    if (!parsed.ok) {
      console.error("[SSR] Blocks response ok: false");
      return null;
    }
    
    console.log("[SSR] Successfully loaded", parsed.blocks?.length ?? 0, "blocks");
    return parsed;
  } catch (err) {
    console.error("[SSR] Blocks fetch error:", err);
    return null;
  }
}

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
 * The page renders blocks immediately from SSR, then the client component
 * takes over for auto-refresh polling. This ensures content is visible
 * even if client JS fails to hydrate.
 */
export default async function BlocksPage() {
  const initial = await getInitialBlocks();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blocks"
        description="Latest blocks from DevNet"
      />
      
      {/* SSR debug info - always show in production for debugging */}
      <div className="text-xs text-slate-600 font-mono">
        SSR: {initial ? `${initial.blocks?.length ?? 0} blocks loaded` : "no initial data"} 
        {initial?.source ? ` (${initial.source})` : ""}
      </div>
      
      {/* SSR fallback for no-JS environments */}
      <SSRBlockList blocks={initial?.blocks ?? []} />
      
      {/* Client component for interactive features */}
      <BlocksClient initial={initial} />
    </div>
  );
}
