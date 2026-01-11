"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState, useCallback } from "react";
import { SourceBadge } from "@/components/common/SourceBadge";
import { DevnetStatus } from "@/components/DevnetStatus";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getValidatorSource } from "@/components/common/ValidatorSourceBadge";
import { fetchProxy } from "@/lib/clientFetch";
import type { DashboardSSRData } from "@/app/page";

// Response types
interface StatusData {
  status?: string;
  node_id?: string;
  version?: string;
  peer_count?: number;
  uptime_seconds?: number;
  mempool_size?: number;
  requests_served?: number;
  network_active?: boolean;
  consensus?: {
    round?: number | string;
    validator_ids?: string[];
    validators?: Record<string, unknown>;
    validator_count?: number;
  };
}

interface IpndhtSummaryData {
  files: number;
  handles: number;
  providers?: number;
  dht_peers?: number;
}

interface PeerInfo {
  peer_id: string;
  address: string;
}

type PeersData = Array<{ peer_id?: string; addr?: string; address?: string }> | { peers?: unknown[] };

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function StatCard({ label, value, href, source }: { label: string; value: string | number; href?: string; source?: "live" | "error" | "loading" }) {
  const content = (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-emerald-100">{value}</p>
      {source && <SourceBadge source={source} />}
    </div>
  );
  
  if (href) {
    return <Link href={href as Route}>{content}</Link>;
  }
  return content;
}

interface DashboardClientProps {
  initial?: DashboardSSRData;
}

export default function DashboardClient({ initial }: DashboardClientProps) {
  // Initialize from SSR data if available
  const [loading, setLoading] = useState(!initial?.statusOk);
  const [status, setStatus] = useState<StatusData | null>(initial?.status ?? null);
  const [ipndht, setIpndht] = useState<IpndhtSummaryData | null>(initial?.ipndht ?? null);
  const [peers, setPeers] = useState<PeerInfo[]>(initial?.peers ?? []);
  const [rpcBase, setRpcBase] = useState<string>(initial?.rpcBase ?? "");
  const [statusSource, setStatusSource] = useState<"live" | "error" | "loading">(
    initial?.statusOk ? "live" : "loading"
  );
  const [ipndhtSource, setIpndhtSource] = useState<"live" | "error" | "loading">(
    initial?.ipndhtOk ? "live" : "loading"
  );
  const [peersSource, setPeersSource] = useState<"live" | "error" | "loading">(
    initial?.peersOk ? "live" : "loading"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);

    const [statusRes, ipndhtRes, peersRes] = await Promise.all([
      fetchProxy<StatusData>("/status"),
      fetchProxy<IpndhtSummaryData>("/ipndht/summary"),
      fetchProxy<PeersData>("/peers"),
    ]);

    // Status
    if (statusRes.ok && statusRes.data) {
      setStatus(statusRes.data);
      setStatusSource("live");
      // Extract rpc_base from raw response if available
      const raw = statusRes.raw as Record<string, unknown> | undefined;
      if (raw?.rpc_base) setRpcBase(String(raw.rpc_base));
    } else {
      setStatusSource("error");
    }

    // IPNDHT
    if (ipndhtRes.ok && ipndhtRes.data) {
      setIpndht(ipndhtRes.data);
      setIpndhtSource("live");
    } else {
      setIpndhtSource("error");
    }

    // Peers - normalize the various response formats
    if (peersRes.ok && peersRes.data) {
      const pdata = peersRes.data;
      let arr: unknown[] = [];
      if (Array.isArray(pdata)) {
        arr = pdata;
      } else if (pdata && typeof pdata === "object" && "peers" in pdata) {
        arr = (pdata.peers as unknown[]) ?? [];
      }
      const normalizedPeers: PeerInfo[] = arr.map((p, i) => {
        if (typeof p === "string") return { peer_id: `peer-${i + 1}`, address: p };
        const obj = p as Record<string, unknown>;
        return {
          peer_id: String(obj.peer_id ?? obj.id ?? `peer-${i + 1}`),
          address: String(obj.address ?? obj.addr ?? "unknown"),
        };
      });
      setPeers(normalizedPeers);
      setPeersSource("live");
    } else {
      setPeersSource("error");
    }

    setLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    // Refresh to validate/update SSR data
    refresh();
  }, [refresh]);

  const devnetOk = statusSource === "live" && status?.status === "ok";
  const validatorIds = status?.consensus?.validator_ids ?? [];
  const { source: validatorSource, count: validatorCount } = status ? getValidatorSource(status) : { source: "unknown", count: 0 };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Devnet-only explorer: live IPPAN devnet RPC (no mock/demo data)"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100 disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <a
              href="/api/rpc/status"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
            >
              View /status JSON
            </a>
          </div>
        }
      />

      {rpcBase && (
        <div className="text-xs text-slate-500">
          Connected to IPPAN DevNet via <code className="rounded bg-slate-900/60 px-1 py-0.5 text-slate-300">{rpcBase}</code>
        </div>
      )}

      <Card title="DevNet status" description="Live status from single canonical RPC gateway">
        <DevnetStatus />
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label="Consensus Round" 
          value={loading ? "..." : status?.consensus?.round ?? "—"} 
          href="/status"
        />
        <StatCard 
          label="Validators" 
          value={loading ? "..." : validatorCount} 
          href="/status"
        />
        <StatCard 
          label="Network Peers" 
          value={loading ? "..." : status?.peer_count ?? peers.length ?? "—"} 
          href="/network"
        />
        <StatCard 
          label="Uptime" 
          value={loading ? "..." : status?.uptime_seconds ? formatUptime(status.uptime_seconds) : "—"} 
        />
      </div>

      {/* Explore Section */}
      <Card title="Explore" description="Entry points for L1, IPNDHT, and L2 surfaces">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ExploreCard
            title="Blocks & Transactions"
            href="/blocks"
            source={statusSource}
            loading={loading}
            value={devnetOk ? "Browse L1 blocks" : "Not available"}
          />
          <ExploreCard
            title="IPNDHT"
            href="/ipndht"
            source={ipndhtSource}
            loading={loading}
            value={ipndhtSource === "live" && ipndht ? `${ipndht.handles} handles · ${ipndht.files} files` : "Not available"}
          />
          <ExploreCard
            title="Network"
            href="/network"
            source={peersSource}
            loading={loading}
            value={peersSource === "live" ? `${status?.peer_count ?? peers.length} peers` : "Not available"}
          />
          <ExploreCard
            title="L2 Modules"
            href="/l2"
            source={ipndhtSource}
            loading={loading}
            value="AI, Legal, DeFi surfaces"
          />
        </div>
      </Card>

      {/* IPNDHT Summary */}
      <Card
        title="IPNDHT"
        description="Files + handles registered against IPNDHT"
        headerSlot={<SourceBadge source={ipndhtSource} />}
      >
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-slate-800 rounded w-32"></div>
            <div className="h-4 bg-slate-800 rounded w-48"></div>
          </div>
        ) : ipndhtSource === "live" && ipndht ? (
          <div className="space-y-2">
            <DetailItem label="Files" value={ipndht.files.toLocaleString()} />
            <DetailItem label="Handles" value={ipndht.handles.toLocaleString()} />
            <DetailItem label="Providers" value={ipndht.providers?.toLocaleString() ?? "—"} />
            <DetailItem label="DHT peers" value={ipndht.dht_peers?.toLocaleString() ?? "—"} />
          </div>
        ) : (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">IPNDHT data not available</p>
            <p className="mt-1 text-xs text-slate-500">
              Try opening <code className="rounded bg-slate-800 px-1">/api/rpc/ipndht/summary</code> to verify endpoint status.
            </p>
          </div>
        )}
      </Card>

      {/* Node Info */}
      {status && (
        <Card title="Node Info" description="Gateway node details" headerSlot={<SourceBadge source={statusSource} />}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Node ID" value={status.node_id ?? "—"} mono />
            <DetailItem label="Version" value={status.version ?? "—"} />
            <DetailItem label="Status" value={status.status ?? "—"} />
            <DetailItem label="Network Active" value={status.network_active ? "Yes" : "No"} />
            <DetailItem label="Mempool Size" value={status.mempool_size?.toString() ?? "—"} />
            <DetailItem label="Requests Served" value={(status.requests_served as number)?.toLocaleString() ?? "—"} />
          </div>
        </Card>
      )}
    </div>
  );
}

function ExploreCard({ title, href, source, loading, value }: { 
  title: string; 
  href: string; 
  source: "live" | "error" | "loading";
  loading: boolean;
  value: string;
}) {
  return (
    <Link 
      href={href as Route}
      className="block rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 hover:border-emerald-500/30 hover:bg-slate-900/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-slate-200">{title}</span>
        <SourceBadge source={loading ? "loading" : source} />
      </div>
      <p className="text-sm text-slate-400">{loading ? "Loading..." : value}</p>
    </Link>
  );
}

function DetailItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded bg-slate-900/40 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`text-sm text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
