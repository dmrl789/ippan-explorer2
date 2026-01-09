"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";

type DataSource = "live" | "error";

interface NormalizedPeer {
  peer_id: string;
  address: string;
  agent?: string;
  last_seen_ms?: number;
}

function normalizePeers(input: unknown): NormalizedPeer[] {
  // Handle various formats: array, { peers: [...] }, { items: [...] }
  let dataArray: unknown[];
  if (Array.isArray(input)) {
    dataArray = input;
  } else if (input && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    if (Array.isArray(obj.peers)) {
      dataArray = obj.peers;
    } else if (Array.isArray(obj.items)) {
      dataArray = obj.items;
    } else {
      return [];
    }
  } else {
    return [];
  }
  
  return dataArray.map((p, index) => {
    // Case 1: string like "http://188.245.97.41:9000"
    if (typeof p === "string") {
      const addr = p.replace("http://", "").replace("https://", "");
      return {
        peer_id: `peer-${index + 1}`,
        address: addr,
      };
    }
    
    // Case 2: object with peer_id/addr
    if (p && typeof p === "object") {
      const obj = p as Record<string, unknown>;
      return {
        peer_id: String(obj.peer_id ?? obj.id ?? `peer-${index + 1}`),
        address: String(obj.address ?? obj.addr ?? obj.multiaddr ?? "unknown"),
        agent: obj.agent ? String(obj.agent) : undefined,
        last_seen_ms: typeof obj.last_seen_ms === "number" ? obj.last_seen_ms : undefined,
      };
    }
    
    return {
      peer_id: `unknown-${index + 1}`,
      address: "unknown",
    };
  }).filter(p => p.address !== "unknown");
}

export default function NetworkPage() {
  const [peers, setPeers] = useState<NormalizedPeer[]>([]);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>("error");

  useEffect(() => {
    async function fetchPeers() {
      setLoading(true);
      setError(null);
      
      try {
        // First try /api/rpc/peers
        const peersRes = await fetch("/api/rpc/peers", { cache: "no-store" });
        const peersJson = await peersRes.json();
        
        if (peersJson.ok && peersJson.data) {
          const normalized = normalizePeers(peersJson.data);
          setPeers(normalized);
          setPeerCount(normalized.length);
          setSource("live");
          return;
        }
        
        // Fallback: get peers from /api/rpc/status
        const statusRes = await fetch("/api/rpc/status", { cache: "no-store" });
        const statusJson = await statusRes.json();
        
        if (statusJson.ok && statusJson.data) {
          const statusData = statusJson.data;
          
          // Get peers array if available
          if (Array.isArray(statusData.peers)) {
            const normalized = normalizePeers(statusData.peers);
            setPeers(normalized);
            setPeerCount(statusData.peer_count ?? normalized.length);
            setSource("live");
          } else if (statusData.peer_count) {
            // No peers array but have count
            setPeerCount(statusData.peer_count);
            setSource("live");
          } else {
            setError("No peer data available");
          }
        } else {
          setError(statusJson.error || "Failed to fetch peer data");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
        setSource("error");
      } finally {
        setLoading(false);
      }
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
