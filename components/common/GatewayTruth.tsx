"use client";

/**
 * Shows the raw /status data that the gateway returned, with timestamp.
 * Provides transparency about what the RPC node is actually reporting.
 */

import { useState } from "react";
import JsonViewer from "@/components/common/JsonViewer";

interface GatewayTruthData {
  node_id?: string;
  peer_count?: number;
  validator_count?: number;
  consensus?: {
    round?: number;
    self_id?: string;
    validator_ids?: string[];
    metrics_available?: boolean;
  };
  network_active?: boolean;
  uptime_seconds?: number;
  version?: string;
}

interface Props {
  status: GatewayTruthData | null | undefined;
  fetchTimestamp?: number; // Unix timestamp in ms
  className?: string;
}

export function GatewayTruth({ status, fetchTimestamp, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);

  const timestamp = fetchTimestamp 
    ? new Date(fetchTimestamp).toISOString() 
    : new Date().toISOString();

  // Extract the subset of fields relevant to validator visibility
  const excerpt = status ? {
    node_id: status.node_id,
    peer_count: status.peer_count,
    network_active: status.network_active,
    consensus: status.consensus ? {
      round: status.consensus.round,
      self_id: status.consensus.self_id,
      validator_ids: status.consensus.validator_ids,
      validator_ids_count: status.consensus.validator_ids?.length ?? 0,
      metrics_available: status.consensus.metrics_available,
    } : undefined,
    uptime_seconds: status.uptime_seconds,
    version: status.version,
  } : null;

  return (
    <div className={`rounded-lg border border-slate-800/70 bg-slate-950/50 ${className}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-900/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">Gateway Truth</span>
          <span className="text-[10px] text-slate-500">
            What the RPC node actually returned
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500">
            Last fetch: {timestamp}
          </span>
          <span className="text-slate-400 text-xs">
            {expanded ? "▼" : "▶"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-800/70 p-4 space-y-3">
          {excerpt ? (
            <>
              {/* Quick summary */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <TruthField label="node_id" value={excerpt.node_id ? `${excerpt.node_id.slice(0, 12)}…` : "missing"} />
                <TruthField label="peer_count" value={excerpt.peer_count?.toString() ?? "missing"} />
                <TruthField label="consensus.round" value={excerpt.consensus?.round?.toString() ?? "missing"} />
                <TruthField 
                  label="validator_ids.length" 
                  value={excerpt.consensus?.validator_ids_count?.toString() ?? "missing"}
                  warn={excerpt.consensus?.validator_ids_count === 0}
                />
              </div>

              {/* Validator IDs sample */}
              {excerpt.consensus?.validator_ids && excerpt.consensus.validator_ids.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1">consensus.validator_ids:</p>
                  <div className="font-mono text-xs text-slate-300 bg-slate-900/50 rounded p-2 overflow-x-auto">
                    {excerpt.consensus.validator_ids.map((id, i) => (
                      <div key={i} className="truncate">
                        [{i}] {id}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full JSON excerpt */}
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-1">Full excerpt:</p>
                <JsonViewer data={excerpt} />
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400">
              No status data available from gateway.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TruthField({ 
  label, 
  value, 
  warn = false 
}: { 
  label: string; 
  value: string; 
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-slate-900/40 px-2 py-1.5">
      <span className="text-[10px] font-mono text-slate-500">{label}</span>
      <span className={`text-xs font-mono ${warn ? "text-amber-300" : "text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
}
