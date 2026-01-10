"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { L2_APPS, type L2App } from "@/lib/l2Config";
import { fetchRpc, type StatusData, type IpndhtSummaryData } from "@/lib/clientRpc";

function categoryLabel(category: L2App["category"]) {
  switch (category) {
    case "ai": return "AI";
    case "legal": return "Legal";
    case "defi": return "DeFi";
    default: return "Other";
  }
}

function categoryStyles(category: L2App["category"]) {
  switch (category) {
    case "ai": return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    case "legal": return "border-sky-500/40 bg-sky-500/10 text-sky-200";
    case "defi": return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    default: return "border-slate-600/60 bg-slate-900/60 text-slate-200";
  }
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded bg-slate-900/40 px-3 py-2">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-200">{value}</span>
    </div>
  );
}

export default function L2Client() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [ipndht, setIpndht] = useState<IpndhtSummaryData | null>(null);
  const [statusSource, setStatusSource] = useState<"live" | "error" | "loading">("loading");
  const [ipndhtSource, setIpndhtSource] = useState<"live" | "error" | "loading">("loading");

  useEffect(() => {
    let alive = true;

    async function loadData() {
      // Use centralized RPC fetch with automatic envelope unwrapping
      const [statusRes, ipndhtRes] = await Promise.all([
        fetchRpc<StatusData>("/status"),
        fetchRpc<IpndhtSummaryData>("/ipndht/summary"),
      ]);

      if (!alive) return;

      // Status - data is already unwrapped by fetchRpc
      if (statusRes.ok && statusRes.data) {
        setStatus(statusRes.data);
        setStatusSource("live");
      } else {
        setStatusSource("error");
      }

      // IPNDHT - data is already unwrapped
      if (ipndhtRes.ok && ipndhtRes.data) {
        setIpndht(ipndhtRes.data);
        setIpndhtSource("live");
      } else {
        setIpndhtSource("error");
      }

      setLoading(false);
    }

    loadData();
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="L2 modules"
        description="IPPAN L2 surfaces run on top of L1 HashTimer, accounts, and IPNDHT descriptors (no invented state)."
        actions={
          <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-100 hover:underline">
            ← Back to dashboard
          </Link>
        }
      />

      {/* L1 Context */}
      <Card title="Current L1 context" description="Snapshot from /status" headerSlot={<SourceBadge source={statusSource} />}>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-slate-800 rounded w-32"></div>
            <div className="h-4 bg-slate-800 rounded w-48"></div>
          </div>
        ) : statusSource === "live" && status ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Node ID" value={status.node_id} />
            <Detail label="Consensus Round" value={`#${status.consensus.round}`} />
            <Detail label="Validators" value={status.consensus.validator_ids?.length ?? 0} />
            <Detail label="Peers" value={status.peer_count} />
          </div>
        ) : (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">L1 context unavailable</p>
            <p className="mt-1 text-xs text-slate-500">
              Try opening <code className="rounded bg-slate-800 px-1">/api/rpc/status</code> to verify endpoint status.
            </p>
          </div>
        )}
      </Card>

      {/* IPNDHT Context */}
      <Card title="IPNDHT context" description="File descriptors and handles footprint" headerSlot={<SourceBadge source={ipndhtSource} />}>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-slate-800 rounded w-32"></div>
          </div>
        ) : ipndhtSource === "live" && ipndht ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Files" value={ipndht.files.toLocaleString()} />
              <Detail label="Handles" value={ipndht.handles.toLocaleString()} />
              <Detail label="Providers" value={ipndht.providers?.toLocaleString() ?? "—"} />
              <Detail label="DHT peers" value={ipndht.dht_peers?.toLocaleString() ?? "—"} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">IPNDHT context unavailable</p>
            <p className="mt-1 text-xs text-slate-500">
              IPNDHT endpoints may not be exposed yet. This is expected during early DevNet phases.
            </p>
          </div>
        )}
      </Card>

      {/* L2 Apps */}
      <Card title="L2 applications" description="AI/Legal/DeFi surfaces on IPPAN L1">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {L2_APPS.map((app) => (
            <div
              key={app.name}
              className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-100">{app.name}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs ${categoryStyles(app.category)}`}>
                  {categoryLabel(app.category)}
                </span>
              </div>
              <p className="text-sm text-slate-400">{app.description}</p>
              {app.ipndhtTag && (
                <div className="text-xs text-slate-500">
                  IPNDHT tag: <code className="rounded bg-slate-800 px-1 text-slate-400">{app.ipndhtTag}</code>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {app.docsUrl && (
                  <a
                    href={app.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-300 underline-offset-4 hover:underline"
                  >
                    Docs
                  </a>
                )}
                {app.externalUrl && (
                  <a
                    href={app.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-300 underline-offset-4 hover:underline"
                  >
                    Explorer
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
