import { safeJsonFetch } from "./rpc";
import { extractIppanTime, extractHashTimer, type ExtractedIppanTime, type ExtractedHashTimer } from "./ippanTime";

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
  // Allow any additional fields (future-proof)
  [key: string]: unknown;
}

/**
 * Serializable version of ExtractedIppanTime for passing to client components.
 * BigInt values are converted to strings.
 */
export interface SerializableIppanTime {
  timeUs: string | null;
  timeMs: number | null;
  isoTimestamp: string | null;
  sourceField: string | null;
  isUnixEpoch: boolean;
}

/**
 * Serializable version of ExtractedHashTimer for passing to client components.
 */
export interface SerializableHashTimer {
  hashTimer: string | null;
  sourceField: string | null;
}

/**
 * Convert ExtractedIppanTime to serializable format.
 */
function toSerializableIppanTime(extracted: ExtractedIppanTime): SerializableIppanTime {
  return {
    timeUs: extracted.timeUs !== null ? extracted.timeUs.toString() : null,
    timeMs: extracted.timeMs,
    isoTimestamp: extracted.isoTimestamp,
    sourceField: extracted.sourceField,
    isUnixEpoch: extracted.isUnixEpoch,
  };
}

/**
 * Convert ExtractedHashTimer to serializable format.
 */
function toSerializableHashTimer(extracted: ExtractedHashTimer): SerializableHashTimer {
  return {
    hashTimer: extracted.hashTimer,
    sourceField: extracted.sourceField,
  };
}

export type StatusFetchResult = 
  | { 
      ok: true; 
      source: "live"; 
      status: DevNetNodeStatus;
      /** Raw status response (preserves all fields including unknown ones) */
      rawStatus: Record<string, unknown>;
      /** Extracted IPPAN time data (serializable for client) */
      ippanTime: SerializableIppanTime;
      /** Extracted HashTimer data (serializable for client) */
      hashTimerData: SerializableHashTimer;
    }
  | { 
      ok: false; 
      source: "error"; 
      error: string; 
      errorCode?: string;
      /** Raw response if available (even on error, may have partial data) */
      rawStatus?: Record<string, unknown>;
    };

export async function fetchStatusWithSource(): Promise<StatusFetchResult> {
  // Fetch raw status without type coercion to preserve all fields
  const rawStatus = await safeJsonFetch<Record<string, unknown>>("/status");

  // No response means gateway is unreachable (this is a real error)
  if (!rawStatus) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
    };
  }

  // Response but missing node_id means invalid/incomplete response
  if (!rawStatus.node_id) {
    return {
      ok: false,
      source: "error",
      error: "Invalid status response from gateway",
      errorCode: "invalid_response",
      rawStatus, // Include raw response even on error for debugging
    };
  }

  // Cast to typed status (keeping raw for all-fields view)
  const status = rawStatus as DevNetNodeStatus;

  // Extract IPPAN time and HashTimer data
  const ippanTimeExtracted = extractIppanTime(rawStatus);
  const hashTimerExtracted = extractHashTimer(rawStatus);

  return { 
    ok: true, 
    source: "live", 
    status,
    rawStatus,
    ippanTime: toSerializableIppanTime(ippanTimeExtracted),
    hashTimerData: toSerializableHashTimer(hashTimerExtracted),
  };
}
