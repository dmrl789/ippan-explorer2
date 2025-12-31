"use client";

import { useEffect, useState } from "react";
import { StatusPill } from "@/components/ui/StatusPill";

/**
 * DevNet status derived from the single canonical RPC gateway.
 * The Explorer does NOT probe individual validator nodes directly.
 * All validator/network data comes from /status on the gateway.
 * 
 * This component uses the /api/rpc/status proxy to avoid CORS issues
 * and provide consistent error handling.
 */
interface GatewayStatus {
  ok: boolean;
  loading: boolean;
  error?: string;
  errorCode?: string;
  nodeId?: string;
  version?: string;
  networkActive?: boolean;
  peerCount?: number;
  consensusRound?: number;
  validatorCount?: number;
  validatorIds?: string[];
  uptimeSeconds?: number;
  mempoolSize?: number;
  rpcBase?: string;
  lastSuccessTs?: number;
  consecutiveFailures?: number;
}

type ValidatorSource = "from_validator_ids" | "from_validators_object" | "unknown";

async function fetchGatewayStatus(): Promise<GatewayStatus> {
  try {
    // Use the API proxy route instead of direct RPC call
    const res = await fetch("/api/rpc/status", {
      cache: "no-store",
    });

    const json = await res.json();

    // Handle proxy error response
    if (!json.ok) {
      return {
        ok: false,
        loading: false,
        error: json.detail || json.error || "Gateway RPC unavailable",
        errorCode: json.error_code || json.error,
        rpcBase: json.rpc_base,
      };
    }

    const data = json.data;

    // Validate we got a proper status response
    if (!data || typeof data !== "object") {
      return {
        ok: false,
        loading: false,
        error: "Invalid response from gateway",
        errorCode: "INVALID_RESPONSE",
        rpcBase: json.rpc_base,
      };
    }

    // Extract data from the DevNet status schema (status_schema_version: 2)
    const validatorIds = data.consensus?.validator_ids ?? [];

    return {
      ok: true,
      loading: false,
      nodeId: data.node_id,
      version: data.version,
      networkActive: data.network_active === true,
      peerCount: typeof data.peer_count === "number" ? data.peer_count : undefined,
      consensusRound: typeof data.consensus?.round === "number" ? data.consensus.round : undefined,
      validatorCount: validatorIds.length,
      validatorIds: validatorIds,
      uptimeSeconds: typeof data.uptime_seconds === "number" ? data.uptime_seconds : undefined,
      mempoolSize: typeof data.mempool_size === "number" ? data.mempool_size : undefined,
      rpcBase: json.rpc_base,
      lastSuccessTs: json.ts,
    };
  } catch (err) {
    // Network error or JSON parse error
    return {
      ok: false,
      loading: false,
      error: err instanceof Error ? err.message : "Gateway RPC unavailable (connection failed)",
      errorCode: "FETCH_ERROR",
    };
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

function getValidatorSource(validatorIds?: string[]): ValidatorSource {
  if (validatorIds && validatorIds.length > 0) {
    return "from_validator_ids";
  }
  return "unknown";
}

function getValidatorSourceLabel(source: ValidatorSource): string {
  switch (source) {
    case "from_validator_ids":
      return "from /status.consensus.validator_ids";
    case "from_validators_object":
      return "from /status.consensus.validators";
    default:
      return "unknown (missing fields)";
  }
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

  // Compute validator identity info
  const validatorIds = status.validatorIds ?? [];
  const uniqueValidatorIds = new Set(validatorIds);
  const hasDuplicateValidatorIds = uniqueValidatorIds.size < validatorIds.length && validatorIds.length > 0;
  const peerValidatorMismatch = status.peerCount !== undefined && 
    status.peerCount > 1 && 
    uniqueValidatorIds.size === 1 && 
    validatorIds.length > 0;
  
  const validatorSource = getValidatorSource(validatorIds);
  const hasIdentityWarning = hasDuplicateValidatorIds || peerValidatorMismatch;

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-semibold text-slate-100">IPPAN DevNet</div>
        <StatusPill status={status.ok ? "ok" : status.loading ? "warn" : "error"} />
      </div>

      <div className="text-slate-400">
        Single RPC gateway: connects to 4 validators + tx bot internally
      </div>

      {status.rpcBase && (
        <div className="text-slate-400">
          Explorer RPC:{" "}
          <code className="break-all rounded bg-slate-900/60 px-1 py-0.5 text-slate-200">{status.rpcBase}</code>
        </div>
      )}

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
            <StatItem 
              label="Validators" 
              value={status.validatorCount?.toString() ?? "—"} 
              warn={hasIdentityWarning}
              tooltip={
                hasIdentityWarning 
                  ? hasDuplicateValidatorIds 
                    ? "Duplicate validator IDs detected! Multiple nodes may share the same identity key."
                    : `Peer/validator mismatch: ${status.peerCount} peers but only ${uniqueValidatorIds.size} validator ID`
                  : undefined
              }
            />
            <StatItem label="Round" value={status.consensusRound !== undefined ? `#${status.consensusRound}` : "—"} />
            <StatItem label="Uptime" value={formatUptime(status.uptimeSeconds)} />
            <StatItem 
              label="Mempool" 
              value={status.mempoolSize?.toString() ?? "—"} 
              tooltip="Mempool size = pending transactions at this node. A value of 0 means no pending transactions right now (network may be idle or transactions are being processed quickly)."
            />
          </div>
          
          {/* Validator source indicator */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-slate-500">Validator count source:</span>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] ${
              validatorSource === "unknown" 
                ? "border-amber-700/50 bg-amber-900/30 text-amber-300"
                : "border-blue-700/50 bg-blue-900/30 text-blue-300"
            }`}>
              {getValidatorSourceLabel(validatorSource)}
            </span>
          </div>

          {/* Identity warning */}
          {hasIdentityWarning && (
            <div className="mt-2 rounded border border-amber-900/50 bg-amber-950/30 p-2">
              <div className="flex items-center gap-1.5 text-amber-300">
                <span>⚠️</span>
                <span className="font-medium">
                  {hasDuplicateValidatorIds 
                    ? "Duplicate Validator IDs" 
                    : "Peer/Validator Mismatch"}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {hasDuplicateValidatorIds 
                  ? `Gateway reports ${validatorIds.length} validators but only ${uniqueValidatorIds.size} unique ID${uniqueValidatorIds.size === 1 ? "" : "s"}. Nodes may share identity keys.`
                  : `Gateway sees ${status.peerCount} peers but only ${uniqueValidatorIds.size} validator identity. Check DLC config or identity keys.`
                }
              </p>
              <a 
                href="/status" 
                className="mt-1 inline-block text-[10px] text-amber-200 underline-offset-2 hover:underline"
              >
                View Validator Identities →
              </a>
            </div>
          )}

          <p className="text-[10px] text-slate-500 mt-2">
            Data from single canonical RPC gateway via /api/rpc/status proxy. Validator details available on Status page.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-300 font-medium">Gateway Offline</span>
            <StatusPill status="error" />
            {status.errorCode && (
              <span className="rounded bg-slate-800/70 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                {status.errorCode}
              </span>
            )}
          </div>
          <p className="text-slate-400">{status.error ?? "RPC gateway unavailable"}</p>
          {status.rpcBase && (
            <p className="text-[10px] text-slate-500 mt-1">
              RPC Base: <code className="text-slate-400">{status.rpcBase}</code>
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href="/api/rpc/debug"
              target="_blank"
              rel="noreferrer"
              className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-600 hover:text-slate-100"
            >
              Open Debug Panel
            </a>
            <a
              href="/api/rpc/status"
              target="_blank"
              rel="noreferrer"
              className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1 text-[10px] text-slate-300 hover:border-slate-600 hover:text-slate-100"
            >
              View /status JSON
            </a>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            The Explorer requires the canonical RPC gateway to be reachable. Check network connectivity.
          </p>
        </div>
      )}
    </div>
  );
}

function StatItem({ 
  label, 
  value, 
  tooltip,
  warn = false,
}: { 
  label: string; 
  value: string; 
  tooltip?: string;
  warn?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${
      warn ? "bg-amber-950/30 border border-amber-900/50" : "bg-slate-900/40"
    }`}>
      <span className="text-slate-500 flex items-center gap-1">
        {label}
        {tooltip && (
          <span
            className={`cursor-help select-none rounded-full border px-1 py-0.5 text-[8px] leading-none ${
              warn 
                ? "border-amber-700/70 bg-amber-900/70 text-amber-300" 
                : "border-slate-700/70 bg-slate-900/70 text-slate-400"
            }`}
            title={tooltip}
          >
            {warn ? "!" : "?"}
          </span>
        )}
      </span>
      <span className={`font-medium ${warn ? "text-amber-200" : "text-slate-200"}`}>
        {value}
        {warn && <span className="ml-1">⚠️</span>}
      </span>
    </div>
  );
}
