"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchProxy } from "@/lib/clientFetch";
import type { NetworkSSRData } from "@/app/network/page";

type DataSource = "live" | "error" | "loading";

interface NormalizedPeer {
  peer_id: string;
  address: string;
}

// Peers response can be array or { peers: [] } or { items: [] }
type PeersApiResponse =
  | Array<{ peer_id?: string; addr?: string; address?: string }>
  | {
      peers?: Array<{ peer_id?: string; addr?: string; address?: string }>;
      items?: Array<{ peer_id?: string; addr?: string; address?: string }>;
    };

// Status response (envelope unwrapped)
interface StatusApiResponse {
  peer_count?: number;
  peers?: Array<string | { peer_id?: string; addr?: string }>;
}

function normalizePeersData(data: unknown): NormalizedPeer[] {
  if (!data) return [];

  let arr: unknown[];
  if (Array.isArray(data)) {
    arr = data;
  } else if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    arr = (obj.peers as unknown[]) ?? (obj.items as unknown[]) ?? [];
  } else {
    return [];
  }

  return arr
    .map((item, i) => {
      if (typeof item === "string") {
        return { peer_id: `peer-${i + 1}`, address: item.replace(/^https?:\/\//, "") };
      }
      if (item && typeof item === "object") {
        const p = item as Record<string, unknown>;
        return {
          peer_id: String(p.peer_id ?? p.id ?? `peer-${i + 1}`),
          address: String(p.address ?? p.addr ?? "unknown"),
        };
      }
      return { peer_id: `peer-${i + 1}`, address: "unknown" };
    })
    .filter((p) => p.address !== "unknown");
}

interface NetworkClientProps {
  initial: NetworkSSRData;
}

export default function NetworkClient({ initial }: NetworkClientProps) {
  const [peers, setPeers] = useState<NormalizedPeer[]>(initial.peers);
  const [peerCount, setPeerCount] = useState<number>(initial.peerCount);
  const [loading, setLoading] = useState(!initial.ok);
  const [error, setError] = useState<string | null>(initial.error ?? null);
  const [source, setSource] = useState<DataSource>(initial.ok ? "live" : "error");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    // Try /peers endpoint first
    const peersRes = await fetchProxy<PeersApiResponse>("/peers");

    if (peersRes.ok && peersRes.data) {
      const normalized = normalizePeersData(peersRes.data);
      if (normalized.length > 0) {
        setPeers(normalized);
        setPeerCount(normalized.length);
        setSource("live");
        setError(null);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
    }

    // Fallback: get peer count from /status
    const statusRes = await fetchProxy<StatusApiResponse>("/status");

    if (statusRes.ok && statusRes.data) {
      const statusData = statusRes.data;

      // Try to get peers from status
      if (Array.isArray(statusData.peers)) {
        const normalized = normalizePeersData(statusData.peers);
        setPeers(normalized);
        setPeerCount(statusData.peer_count ?? normalized.length);
      } else if (typeof statusData.peer_count === "number") {
        setPeerCount(statusData.peer_count);
      }
      setSource("live");
      setError(null);
    } else if (!peersRes.ok) {
      // Both endpoints failed
      const peersError = peersRes.error;
      const statusError = statusRes.ok ? null : statusRes.error;
      setError(peersError || statusError || "Failed to fetch peer data");
      setSource("error");
    }

    setLoading(false);
    setIsRefreshing(false);
  }, []);

  // Initial refresh on mount
  useEffect(() => {
    // If SSR already provided data, just validate with a refresh
    refresh();
  }, [refresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, refresh]);

  return (
    <Card
      title="Peers"
      description="Connected peer addresses"
      headerSlot={
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
          <SourceBadge source={source} />
        </div>
      }
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
          <p className="mt-1 text-xs text-slate-500">
            The gateway may be temporarily unavailable. Click Refresh to try again.
          </p>
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
                    <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">
                      Address
                    </th>
                    <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500 hidden sm:table-cell">
                      ID
                    </th>
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
  );
}
