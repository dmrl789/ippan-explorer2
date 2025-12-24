"use client";

import { useEffect, useState } from "react";
import { IPPAN_RPC_BASE } from "@/lib/rpc";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * DevNet status derived from the single canonical RPC gateway.
 * The Explorer does NOT probe individual validator nodes directly.
 * All validator/network data comes from /status on the gateway.
 */
interface GatewayStatus {
  ok: boolean;
  loading: boolean;
  error?: string;
  nodeId?: string;
  version?: string;
  networkActive?: boolean;
  peerCount?: number;
  consensusRound?: number;
  validatorCount?: number;
  uptimeSeconds?: number;
  mempoolSize?: number;
}

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

async function fetchGatewayStatus(): Promise<GatewayStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const base = normalizeBase(IPPAN_RPC_BASE);
    const res = await fetch(`${base}/status`, {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      return {
        ok: false,
        loading: false,
        error: `Gateway RPC error: ${res.status} ${res.statusText}`,
      };
    }

    const json = await res.json();

    // Validate we got a proper status response
    if (!json || typeof json !== "object") {
      return {
        ok: false,
        loading: false,
        error: "Invalid response from gateway",
      };
    }

    // Extract data from the DevNet status schema (status_schema_version: 2)
    const validatorIds = json.consensus?.validator_ids ?? [];

    return {
      ok: true,
      loading: false,
      nodeId: json.node_id,
      version: json.version,
      networkActive: json.network_active === true,
      peerCount: typeof json.peer_count === "number" ? json.peer_count : undefined,
      consensusRound: typeof json.consensus?.round === "number" ? json.consensus.round : undefined,
      validatorCount: validatorIds.length,
      uptimeSeconds: typeof json.uptime_seconds === "number" ? json.uptime_seconds : undefined,
      mempoolSize: typeof json.mempool_size === "number" ? json.mempool_size : undefined,
    };
  } catch (err) {
    // Distinguish between timeout/abort and other errors
    const isAbort = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      loading: false,
      error: isAbort
        ? "Gateway RPC timeout (node may be unreachable)"
        : "Gateway RPC unavailable (connection failed)",
    };
  } finally {
    clearTimeout(timeout);
  }
}

function formatUptime(seconds?: number): string {
  if (seconds === undefined) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function DevnetStatus() {
  const [status, setStatus] = useState<GatewayStatus>({ ok: false, loading: true });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const result = await fetchGatewayStatus();
      if (!cancelled) {
        setStatus(result);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const configuredBase = normalizeBase(IPPAN_RPC_BASE);

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-semibold text-slate-100">IPPAN DevNet</div>
        <StatusPill status={status.ok ? "ok" : status.loading ? "warn" : "error"} />
      </div>

      <div className="text-slate-400">
        Single RPC gateway: connects to 4 validators + tx bot internally
      </div>

      <div className="text-slate-400">
        Explorer RPC:{" "}
        <code className="break-all rounded bg-slate-900/60 px-1 py-0.5 text-slate-200">{configuredBase}</code>
      </div>

      {status.loading ? (
        <div className="text-slate-400">Checking gateway…</div>
      ) : status.ok ? (
        <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-emerald-300 font-medium">Gateway Online</span>
            <StatusPill status="ok" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <StatItem label="Node ID" value={status.nodeId ? `${status.nodeId.slice(0, 12)}…` : "—"} />
            <StatItem label="Version" value={status.version ?? "—"} />
            <StatItem label="Network" value={status.networkActive ? "Active" : "Inactive"} />
            <StatItem label="Peers" value={status.peerCount?.toString() ?? "—"} />
            <StatItem label="Validators" value={status.validatorCount?.toString() ?? "—"} />
            <StatItem label="Round" value={status.consensusRound !== undefined ? `#${status.consensusRound}` : "—"} />
            <StatItem label="Uptime" value={formatUptime(status.uptimeSeconds)} />
            <StatItem label="Mempool" value={status.mempoolSize?.toString() ?? "—"} />
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Data from single canonical RPC gateway. Validator details available on Status page.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-300 font-medium">Gateway Offline</span>
            <StatusPill status="error" />
          </div>
          <p className="text-slate-400">{status.error ?? "RPC gateway unavailable"}</p>
          <p className="text-[10px] text-slate-500 mt-2">
            The Explorer requires the canonical RPC gateway to be reachable. Check network connectivity.
          </p>
        </div>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-slate-900/40 px-2 py-1">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}
