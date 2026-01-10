"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { 
  fetchRpc, 
  normalizePeers, 
  type StatusData, 
  type PeersData, 
  type PeerInfo 
} from "@/lib/clientRpc";

type DataSource = "live" | "error";

interface NormalizedPeer {
  peer_id: string;
  address: string;
  agent?: string;
  last_seen_ms?: number;
}

export default function NetworkPage() {
  const [peers, setPeers] = useState<NormalizedPeer[]>([]);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Start with "live" - only show "error" if fetches actually fail
  const [source, setSource] = useState<DataSource>("live");

  useEffect(() => {
    async function fetchPeers() {
      setLoading(true);
      setError(null);
      
      // Use centralized RPC fetch with automatic envelope unwrapping
      // First try /peers endpoint
      const peersRes = await fetchRpc<PeersData>("/peers");
      
      if (peersRes.ok && peersRes.data) {
        const normalized = normalizePeers(peersRes.data) as NormalizedPeer[];
        setPeers(normalized);
        setPeerCount(normalized.length);
        setSource("live");
        setLoading(false);
        return;
      }
      
      // Fallback: get peer count from /status
      const statusRes = await fetchRpc<StatusData>("/status");
      
      if (statusRes.ok && statusRes.data) {
        const statusData = statusRes.data;
        
        // Check if status has peers array
        const statusPeers = (statusData as Record<string, unknown>).peers;
        if (Array.isArray(statusPeers)) {
          const normalized = normalizePeers(statusPeers) as NormalizedPeer[];
          setPeers(normalized);
          setPeerCount(statusData.peer_count ?? normalized.length);
        } else if (typeof statusData.peer_count === "number") {
          // No peers array but have count - this is still a success!
          setPeerCount(statusData.peer_count);
        }
        // Status fetch succeeded - mark as live (even if peer data is partial)
        setSource("live");
      } else {
        // Both /peers AND /status failed - this is a real error
        setError(peersRes.error || statusRes.error || "Failed to fetch peer data");
        setSource("error");
      }
      
      setLoading(false);
    }
    
    fetchPeers();
    const interval = setInterval(fetchPeers, 30000);
    return () => clearInterval(interval);
  }, []);

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

      <Card
        title="Peers"
        description="Connected peer addresses"
        headerSlot={<SourceBadge source={source} />}
      >
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-24"></div>
            <div className="h-4 bg-slate-800 rounded w-full"></div>
            <div className="h-4 bg-slate-800 rounded w-3/4"></div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">{error}</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-3xl font-semibold text-emerald-100">{peerCount}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">Peers discovered</p>
            </div>

            {peers.length > 0 ? (
              <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 overflow-hidden">
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
            ) : peerCount > 0 ? (
              <p className="text-sm text-slate-400">
                {peerCount} peers connected (individual addresses not exposed in this view)
              </p>
            ) : (
              <p className="text-sm text-slate-400">No peers discovered yet</p>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
