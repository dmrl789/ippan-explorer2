import { safeJsonFetch } from "./rpc";

/**
 * Actual DevNet node /status response (status_schema_version: 2).
 * This is what the live nodes return, distinct from the legacy StatusResponseV1.
 */
export interface DevNetNodeStatus {
  node_id: string;
  version: string;
  build_sha?: string;
  status: string; // "ok"
  status_schema_version: number;
  network_active: boolean;
  peer_count: number;
  mempool_size: number;
  uptime_seconds: number;
  requests_served: number;
  ai: {
    enabled: boolean;
    using_stub: boolean;
    model_hash: string;
    model_version: string;
    consensus_mode: string; // "DLC"
    shadow_configured?: boolean;
    shadow_loaded?: boolean;
    shadow_model_hash?: string;
    shadow_model_version?: string;
  };
  consensus: {
    round: number;
    self_id: string;
    metrics_available: boolean;
    metrics_placeholder?: boolean;
    validator_ids: string[];
    validators: Record<string, {
      blocks_proposed: number;
      blocks_verified: number;
      honesty: number;
      latency: number;
      rounds_active: number;
      slashing_events_90d: number;
      stake: { micro_ipn: string };
      uptime: number;
    }>;
  };
  dataset_export?: {
    enabled: boolean;
    last_age_seconds: number;
    last_ts_utc: string;
  };
}

export async function fetchStatusWithSource(): Promise<
  | { ok: true; source: "live"; status: DevNetNodeStatus }
  | { ok: false; source: "error"; error: string; errorCode?: string }
> {
  const status = await safeJsonFetch<DevNetNodeStatus>("/status");

  // No response means gateway is unreachable (this is a real error)
  if (!status) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
    };
  }

  // Response but missing node_id means invalid/incomplete response
  if (!status.node_id) {
    return {
      ok: false,
      source: "error",
      error: "Invalid status response from gateway",
      errorCode: "invalid_response",
    };
  }

  return { ok: true, source: "live", status };
}
