"use client";

import { useState, useEffect } from "react";
import JsonViewer from "@/components/common/JsonViewer";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { ValidatorSourceBadge, getValidatorSource } from "@/components/common/ValidatorSourceBadge";
import { ValidatorIdentityPanel } from "@/components/common/ValidatorIdentityPanel";

type DataSource = "live" | "error";

interface StatusData {
  node_id?: string;
  version?: string;
  build_sha?: string;
  status?: string;
  network_active?: boolean;
  peer_count?: number;
  peers?: string[];
  mempool_size?: number;
  uptime_seconds?: number;
  requests_served?: number;
  validator_count?: number;
  ai?: {
    enabled?: boolean;
    using_stub?: boolean;
    model_hash?: string;
    model_version?: string;
    consensus_mode?: string;
    shadow_loaded?: boolean;
    shadow_model_hash?: string;
  };
  consensus?: {
    round?: number;
    self_id?: string;
    validator_ids?: string[];
    validators?: Record<string, unknown>;
    metrics_available?: boolean;
  };
}

function formatUptime(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h ${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

export default function StatusPage() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<DataSource>("error");

  useEffect(() => {
    async function fetchStatus() {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch("/api/rpc/status", { cache: "no-store" });
        const json = await res.json();
        
        if (json.ok && json.data) {
          setStatus(json.data);
          setSource("live");
        } else {
          setError(json.error || json.detail || "Failed to fetch status");
          setSource("error");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
        setSource("error");
      } finally {
        setLoading(false);
      }
    }
    
    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const validatorIds = status?.consensus?.validator_ids ?? [];
  const { source: validatorSource, count: validatorCount } = getValidatorSource(status);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Status" description="Loading status from DevNet RPC..." />
        <Card>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-800 rounded w-3/4"></div>
            <div className="h-4 bg-slate-800 rounded w-1/2"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Status" 
        description="Operator / cluster view from devnet RPC"
        actions={
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50"
          >
            Refresh
          </button>
        }
      />

      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-900/20 p-4">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Gateway Probe */}
        <Card title="Gateway Probe" description="Connection details" headerSlot={<SourceBadge source={source} />}>
          <div className="space-y-3 text-sm text-slate-200">
            <KeyValue label="Status" value={status ? "Connected" : "Disconnected"} />
            <KeyValue label="Last fetch" value={new Date().toLocaleTimeString()} />
            {status && (
              <KeyValue label="Requests Served" value={status.requests_served?.toLocaleString() ?? "—"} />
            )}
          </div>
        </Card>

        {/* Node Status */}
        <Card title="Node Status" description="From /status" headerSlot={<SourceBadge source={source} />}>
          {status ? (
            <div className="space-y-3 text-sm text-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Network Active</span>
                <StatusPill status={status.network_active ? "ok" : "warn"} />
              </div>
              <KeyValue label="Node ID" value={status.node_id ?? "—"} />
              <KeyValue label="Version" value={status.version ?? "—"} />
              <KeyValue label="Uptime" value={formatUptime(status.uptime_seconds)} />
              <KeyValue label="Peer Count" value={status.peer_count?.toString() ?? "—"} />
              <KeyValue label="Mempool Size" value={status.mempool_size?.toString() ?? "Not exposed"} />
              <KeyValue label="Consensus Round" value={status.consensus?.round != null ? `#${status.consensus.round}` : "—"} />
            </div>
          ) : (
            <p className="text-sm text-slate-400">Status unavailable</p>
          )}
        </Card>

        {/* Validators */}
        <Card title="Validators" headerSlot={<ValidatorSourceBadge source={validatorSource} />}>
          <div className="space-y-3 text-sm text-slate-200">
            <div className="text-3xl font-semibold text-emerald-100">{validatorCount}</div>
            <p className="text-xs text-slate-500">Active validators in consensus</p>
          </div>
        </Card>

        {/* AI Status - from status.ai, NOT separate endpoint */}
        <Card title="AI Status" description="From /status.ai" headerSlot={<SourceBadge source={source} />}>
          {status?.ai ? (
            <div className="space-y-2 text-sm">
              <StatusPill status={status.ai.using_stub ? "warn" : "ok"} />
              <KeyValue label="AI Enabled" value={status.ai.enabled ? "Yes" : "No"} />
              <KeyValue label="Consensus Mode" value={status.ai.consensus_mode ?? "—"} />
              <KeyValue label="Using Stub" value={status.ai.using_stub ? "Yes" : "No"} />
              <KeyValue label="Model Version" value={status.ai.model_version ?? "—"} />
              <p className="text-xs text-slate-400 mt-2">Model hash</p>
              <p className="font-mono text-xs text-slate-300 break-all">{status.ai.model_hash ?? "—"}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">AI status not available in /status response</p>
          )}
        </Card>
      </div>

      {/* Validator Identity Panel */}
      <Card 
        title="Validator Identities" 
        description="Validator IDs from /status"
        headerSlot={<ValidatorSourceBadge source={validatorSource} />}
      >
        {status && validatorIds.length > 0 ? (
          <ValidatorIdentityPanel 
            validatorIds={validatorIds}
            selfId={status.consensus?.self_id}
            reportedValidatorCount={validatorCount}
          />
        ) : (
          <p className="text-sm text-slate-400">
            {validatorSource === "unknown" 
              ? "Validator IDs not available in response"
              : "No validator data"}
          </p>
        )}
      </Card>

      {/* Peer List */}
      <Card title="Connected Peers" headerSlot={<SourceBadge source={source} />}>
        {status?.peers && status.peers.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Total:</span>
              <span className="text-sm font-semibold text-slate-100">{status.peers.length}</span>
            </div>
            <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 overflow-hidden max-h-48 overflow-y-auto">
              <div className="divide-y divide-slate-800/50">
                {status.peers.slice(0, 20).map((peer, i) => (
                  <div key={i} className="px-3 py-2">
                    <span className="font-mono text-xs text-slate-300">
                      {peer.replace("http://", "").replace("https://", "")}
                    </span>
                  </div>
                ))}
                {status.peers.length > 20 && (
                  <div className="px-3 py-2 text-xs text-slate-500">
                    ...and {status.peers.length - 20} more
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">
            {status?.peer_count ? `${status.peer_count} peers (addresses not exposed)` : "No peer data"}
          </p>
        )}
      </Card>

      {/* Raw JSON */}
      <Card title="Raw /status JSON" description="Complete response from API">
        <JsonViewer data={status || { error: error || "No data" }} />
      </Card>
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}
