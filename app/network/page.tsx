import { getPeers, getStatus, type NormalizedPeer, type StatusData } from "@/lib/serverFetch";
import NetworkClient from "@/components/network/NetworkClient";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";

// Force Node.js runtime - Edge runtime cannot fetch plain http:// URLs reliably
export const runtime = "nodejs";
// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface NetworkSSRData {
  peers: NormalizedPeer[];
  peerCount: number;
  ok: boolean;
  error?: string;
}

/**
 * SSR Peer List - Renders peers directly in server HTML.
 * This ensures content is visible even if client JS fails to hydrate.
 */
function SSRPeerList({ peers, peerCount }: { peers: NormalizedPeer[]; peerCount: number }) {
  if (peers.length === 0 && peerCount === 0) {
    return (
      <noscript>
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-sm text-slate-400">
          No peers available (SSR). Enable JavaScript for auto-refresh.
        </div>
      </noscript>
    );
  }

  return (
    <noscript>
      <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-slate-800/50">
          <span className="text-sm font-semibold text-slate-100">Network Peers (SSR)</span>
          <span className="text-xs text-slate-500">{peerCount} peers</span>
        </div>
        {peers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr className="border-b border-slate-800">
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Address</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500 hidden sm:table-cell">ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {peers.map((peer, i) => (
                  <tr key={i} className="hover:bg-slate-900/30">
                    <td className="px-4 py-2">
                      <span className="font-mono text-xs text-emerald-300">{peer.address}</span>
                    </td>
                    <td className="px-4 py-2 hidden sm:table-cell">
                      <span className="font-mono text-xs text-slate-500">{peer.peer_id}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-sm text-slate-400">
            {peerCount} peers connected (individual addresses not exposed in this view)
          </div>
        )}
        <div className="p-3 border-t border-slate-800/50 text-xs text-slate-500">
          Enable JavaScript for auto-refresh and full functionality.
        </div>
      </div>
    </noscript>
  );
}

/**
 * Network page with SSR initial data.
 *
 * KEY FIX: This page now calls getPeers() DIRECTLY instead of
 * fetching via HTTP. This eliminates the "fetch myself over HTTP"
 * problem that causes SSR to fail on Vercel serverless.
 */
export default async function NetworkPage() {
  console.log("[NetworkPage] SSR: calling getPeers/getStatus directly (no HTTP self-fetch)");

  let initialPeers: NormalizedPeer[] = [];
  let initialPeerCount = 0;
  let ssrOk = false;
  let ssrError: string | null = null;

  try {
    // Fetch peers and status in parallel
    const [peersResult, statusResult] = await Promise.all([getPeers(), getStatus()]);

    if (peersResult.ok && peersResult.data) {
      initialPeers = peersResult.data;
      initialPeerCount = peersResult.data.length;
      ssrOk = true;
    }

    // Get peer count from status if peers endpoint didn't return data
    if (statusResult.ok && statusResult.data) {
      const statusData = statusResult.data as StatusData;
      if (typeof statusData.peer_count === "number") {
        initialPeerCount = Math.max(initialPeerCount, statusData.peer_count);
      }
      ssrOk = true;
    }

    if (!peersResult.ok && !statusResult.ok) {
      ssrError = peersResult.error || statusResult.error || "Failed to fetch network data";
    }

    console.log(`[NetworkPage] SSR: got ${initialPeers.length} peers, count=${initialPeerCount}`);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    ssrError = errorMessage;
    console.error("[NetworkPage] SSR error:", err);
  }

  const initialData: NetworkSSRData = {
    peers: initialPeers,
    peerCount: initialPeerCount,
    ok: ssrOk,
    error: ssrError ?? undefined,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Network Peers"
        description="Peer inventory from DevNet"
        actions={
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-100">
            ← Back to dashboard
          </Link>
        }
      />

      {/* SSR debug info */}
      <div className="text-xs text-slate-600 font-mono">
        SSR: {ssrOk ? `${initialPeers.length} peers (count: ${initialPeerCount})` : "no initial data"}
        {ssrError ? ` [error: ${ssrError}]` : ""}
      </div>

      {/* SSR error display */}
      {ssrError && (
        <div className="mt-2 rounded-xl border border-red-800/50 bg-red-950/30 p-3 text-sm">
          <div className="font-semibold text-red-300">SSR error</div>
          <div className="text-red-400/80 font-mono text-xs mt-1">{ssrError}</div>
        </div>
      )}

      {/* SSR fallback for no-JS environments */}
      <SSRPeerList peers={initialPeers} peerCount={initialPeerCount} />

      {/* Client component for interactive features */}
      <NetworkClient initial={initialData} />
    </div>
  );
}
