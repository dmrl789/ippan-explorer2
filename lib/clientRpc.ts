/**
 * Client-side RPC fetch helper.
 * 
 * This module provides a centralized way to fetch data from the RPC proxy
 * endpoints (/api/rpc/*) with consistent response handling.
 * 
 * The proxy returns responses in TWO formats:
 * 
 * 1. Envelope format (most endpoints):
 * {
 *   ok: boolean,
 *   data: T,              // The actual payload
 *   rpc_base: string,
 *   status_code?: number,
 *   ...
 * }
 * 
 * 2. Plain format (e.g., /blocks):
 * {
 *   ok: boolean,
 *   blocks: [...],        // Payload at top level, no `data` wrapper
 *   source?: string,
 *   ...
 * }
 * 
 * This helper handles BOTH formats and provides a clean interface:
 * {
 *   ok: boolean,
 *   data: T | null,       // The payload (unwrapped from envelope or plain)
 *   error?: string,
 *   rpcBase?: string
 * }
 */

/**
 * Result type returned by fetchRpc
 */
export interface RpcResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
  errorCode?: string;
  rpcBase?: string;
  statusCode?: number;
  /** Raw response for debugging */
  raw?: unknown;
}

/**
 * Check if response is an envelope format with `data` field.
 */
function isEnvelope(json: unknown): json is { ok: boolean; data?: unknown; status_code?: number; rpc_base?: string; error?: string; error_code?: string; detail?: string } {
  return (
    json !== null &&
    typeof json === "object" &&
    "ok" in json &&
    "data" in json
  );
}

/**
 * Unwrap the response - handles both envelope and plain formats.
 * 
 * @returns { ok, data, raw } where data is the unwrapped payload
 */
function unwrapResponse<T>(json: unknown): { ok: boolean; data: T | null; error?: string; errorCode?: string; rpcBase?: string; statusCode?: number; raw: unknown } {
  if (!json || typeof json !== "object") {
    return { ok: false, data: null, error: "Invalid response", raw: json };
  }

  const obj = json as Record<string, unknown>;
  
  // Check if this is an error response
  const isOk = obj.ok !== false;
  
  if (!isOk) {
    return {
      ok: false,
      data: null,
      error: (obj.detail as string) || (obj.error as string) || "RPC error",
      errorCode: obj.error_code as string,
      rpcBase: obj.rpc_base as string,
      statusCode: obj.status_code as number,
      raw: json,
    };
  }

  // Format 1: Envelope with `data` field → unwrap
  if ("data" in obj) {
    return {
      ok: true,
      data: (obj.data ?? null) as T | null,
      rpcBase: obj.rpc_base as string,
      statusCode: obj.status_code as number,
      raw: json,
    };
  }

  // Format 2: Plain response (e.g., { ok: true, blocks: [...] }) → return as-is
  // The entire object IS the payload
  return {
    ok: true,
    data: json as T,
    rpcBase: obj.rpc_base as string,
    statusCode: obj.status_code as number,
    raw: json,
  };
}

/**
 * Fetch from the RPC proxy with automatic response unwrapping.
 * 
 * Handles both envelope format ({ ok, data: {...} }) and plain format ({ ok, blocks: [...] }).
 * 
 * @param path - The RPC path (e.g., "/status", "/peers", "/blocks")
 * @returns Promise with unwrapped data or error
 * 
 * @example
 * ```ts
 * // Envelope format (most endpoints)
 * const status = await fetchRpc<StatusData>("/status");
 * if (status.ok && status.data) {
 *   console.log(status.data.peer_count);
 * }
 * 
 * // Plain format (blocks)
 * const blocks = await fetchRpc<BlocksResponse>("/blocks");
 * if (blocks.ok && blocks.data) {
 *   console.log(blocks.data.blocks); // blocks array is at top level
 * }
 * ```
 */
export async function fetchRpc<T>(path: string): Promise<RpcResult<T>> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `/api/rpc${normalizedPath}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    // Even if HTTP status is error (4xx/5xx), try to parse the JSON response
    // because our proxy always returns structured JSON with error details
    let json: unknown;
    try {
      json = await res.json();
    } catch {
      // JSON parse failed - this is a real error
      return {
        ok: false,
        data: null,
        error: `HTTP ${res.status}: Failed to parse response`,
        errorCode: "JSON_PARSE_ERROR",
        statusCode: res.status,
      };
    }

    // Unwrap the response (handles both envelope and plain formats)
    const result = unwrapResponse<T>(json);
    
    // If HTTP status indicates error but JSON says ok, trust HTTP
    if (!res.ok && result.ok) {
      return {
        ok: false,
        data: null,
        error: `HTTP ${res.status}`,
        statusCode: res.status,
        raw: json,
      };
    }

    return result;
  } catch (err) {
    // Network error (fetch itself failed)
    return {
      ok: false,
      data: null,
      error: err instanceof Error ? err.message : "Network request failed",
      errorCode: "NETWORK_ERROR",
    };
  }
}

/**
 * Convert timestamp to milliseconds.
 * 
 * The DevNet API returns timestamps in microseconds (e.g., 1767806434286085).
 * This function detects and converts them to milliseconds for use with Date().
 * 
 * Heuristic: microseconds are ~1e15, milliseconds are ~1e12
 */
export function toMs(ts: number | string | undefined | null): number | null {
  if (ts === undefined || ts === null) return null;
  
  const num = typeof ts === "string" ? parseInt(ts, 10) : ts;
  if (isNaN(num)) return null;
  
  // If timestamp is > 50 trillion, it's likely microseconds
  if (num > 50_000_000_000_000) {
    return Math.floor(num / 1000);
  }
  
  return num;
}

/**
 * Format a timestamp (possibly in microseconds) to a locale string.
 */
export function formatTimestamp(ts: number | string | undefined | null): string {
  const ms = toMs(ts);
  if (ms === null) return "—";
  
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
}

/**
 * Convenience type for common RPC response shapes
 */
export interface StatusData {
  node_id: string;
  version: string;
  status: string;
  network_active: boolean;
  peer_count: number;
  mempool_size: number;
  uptime_seconds: number;
  requests_served?: number;
  consensus: {
    round: number;
    self_id: string;
    validator_ids: string[];
    validators?: Record<string, unknown>;
    metrics_available?: boolean;
  };
  ai?: {
    enabled: boolean;
    model_version: string;
    using_stub?: boolean;
    model_hash?: string;
    consensus_mode?: string;
  };
  [key: string]: unknown;
}

export interface IpndhtSummaryData {
  handles: number;
  files: number;
  providers?: number;
  dht_peers?: number;
  dht_enabled?: boolean;
}

export interface PeerInfo {
  peer_id: string;
  addr?: string;
  address?: string;
  agent?: string;
  last_seen_ms?: number;
}

export interface PeersData {
  peers?: PeerInfo[];
  items?: PeerInfo[];
  count?: number;
}

export interface HandleRecord {
  handle: string;
  owner?: string;
  expires_at?: string;
}

export interface FileRecord {
  id: string;
  file_id?: string;
  owner?: string;
  mime_type?: string;
  size_bytes?: number;
  availability?: string | number;
  dht_published?: boolean;
  tags?: string[];
  meta?: Record<string, unknown>;
}

export interface HandlesResponse {
  items: HandleRecord[];
  total?: number;
}

export interface FilesResponse {
  items: FileRecord[];
  total?: number;
}

/**
 * Blocks API response (plain format, not envelope wrapped)
 */
export interface BlocksApiResponse {
  ok: boolean;
  blocks: Array<{
    block_hash: string;
    tx_count?: number;
    timestamp?: number;
    ippan_time_ms?: number;
    round_id?: number | string;
    prev_block_hash?: string;
    hashtimer?: string;
    hash_timer_id?: string;
  }>;
  source?: string;
  fallback_reason?: string | null;
  derived_block_hashes_count?: number;
  hydrated_blocks_count?: number;
  warnings?: string[];
  meta?: Record<string, unknown>;
}

/**
 * Normalize peers data from various response formats
 */
export function normalizePeers(data: unknown): PeerInfo[] {
  if (!data) return [];
  
  // Handle array directly
  if (Array.isArray(data)) {
    return normalizePeerArray(data);
  }
  
  // Handle { peers: [...] } format
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.peers)) {
      return normalizePeerArray(obj.peers);
    }
    if (Array.isArray(obj.items)) {
      return normalizePeerArray(obj.items);
    }
  }
  
  return [];
}

function normalizePeerArray(arr: unknown[]): PeerInfo[] {
  return arr.map((item, index) => {
    if (typeof item === "string") {
      // String format like "http://188.245.97.41:9000"
      const addr = item.replace(/^https?:\/\//, "");
      return {
        peer_id: `peer-${index + 1}`,
        address: addr,
      };
    }
    
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
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
