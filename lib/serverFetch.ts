/**
 * Shared server-side fetch helpers for SSR.
 *
 * These functions call the gateway directly using IPPAN_RPC_BASE_URL,
 * eliminating the "fetch myself over HTTP" problem that causes SSR to fail
 * on Vercel serverless.
 *
 * Use these in SSR pages (async Server Components) to get initial data.
 * Client components should use lib/clientFetch.ts instead.
 */

import { proxyRpcRequest, getServerRpcBase } from "./rpcProxy";
import { getBlocksWithFallback, type BlocksApiResponse } from "./blocksService";

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { getBlocksWithFallback, type BlocksApiResponse };

// ============================================================================
// Types
// ============================================================================

export interface StatusData {
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

export interface IpndhtSummaryData {
  files: number;
  handles: number;
  providers?: number;
  dht_peers?: number;
}

export interface IpndhtFilesData {
  items?: IpndhtFileRecord[];
  files?: IpndhtFileRecord[];
  total?: number;
}

export interface IpndhtFileRecord {
  id: string;
  file_id?: string;
  owner?: string;
  mime_type?: string;
  size_bytes?: number;
  availability?: string;
  dht_published?: boolean;
  tags?: string[];
  meta?: { doctype?: string };
}

export interface IpndhtHandlesData {
  items?: IpndhtHandleRecord[];
  handles?: IpndhtHandleRecord[];
  total?: number;
}

export interface IpndhtHandleRecord {
  handle: string;
  owner?: string;
  expires_at?: string;
}

export interface PeerRecord {
  peer_id?: string;
  id?: string;
  address?: string;
  addr?: string;
}

export type PeersData =
  | PeerRecord[]
  | { peers?: PeerRecord[]; items?: PeerRecord[] };

export interface NormalizedPeer {
  peer_id: string;
  address: string;
}

// Generic result type for server fetch functions
export interface ServerFetchResult<T> {
  ok: boolean;
  data: T | null;
  error?: string;
  rpcBase: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

function normalizeRpcResponse<T>(
  result: { ok: boolean; data?: unknown; detail?: string; error?: string; rpc_base: string }
): ServerFetchResult<T> {
  if (!result.ok || result.data === undefined) {
    return {
      ok: false,
      data: null,
      error: result.detail || result.error || "RPC request failed",
      rpcBase: result.rpc_base,
    };
  }

  // If the data itself has a nested `data` field (envelope), unwrap it
  const rawData = result.data as Record<string, unknown>;
  if (rawData && typeof rawData === "object" && "data" in rawData && rawData.data !== undefined) {
    return {
      ok: true,
      data: rawData.data as T,
      rpcBase: result.rpc_base,
    };
  }

  return {
    ok: true,
    data: result.data as T,
    rpcBase: result.rpc_base,
  };
}

function normalizePeers(data: unknown): NormalizedPeer[] {
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

// ============================================================================
// Server Fetch Functions
// ============================================================================

/**
 * Get /status from the gateway.
 */
export async function getStatus(): Promise<ServerFetchResult<StatusData>> {
  console.log("[serverFetch] getStatus() - calling gateway directly");
  const result = await proxyRpcRequest<StatusData>("/status", { timeout: 5000 });
  return normalizeRpcResponse<StatusData>(result);
}

/**
 * Get /peers from the gateway.
 * Returns normalized peer list.
 */
export async function getPeers(): Promise<ServerFetchResult<NormalizedPeer[]>> {
  console.log("[serverFetch] getPeers() - calling gateway directly");
  const result = await proxyRpcRequest<PeersData>("/peers", { timeout: 5000 });

  if (!result.ok) {
    // Try getting peer info from /status as fallback
    const statusResult = await proxyRpcRequest<StatusData>("/status", { timeout: 5000 });
    if (statusResult.ok && statusResult.data) {
      const statusData = statusResult.data as StatusData;
      if (Array.isArray(statusData.consensus?.validator_ids)) {
        // Create synthetic peers from validator_ids
        const syntheticPeers: NormalizedPeer[] = statusData.consensus.validator_ids.map(
          (id, i) => ({
            peer_id: id,
            address: `validator-${i + 1}`,
          })
        );
        return {
          ok: true,
          data: syntheticPeers,
          rpcBase: result.rpc_base,
        };
      }
      // At minimum return peer count info
      if (typeof statusData.peer_count === "number" && statusData.peer_count > 0) {
        return {
          ok: true,
          data: [], // Empty but ok means count is known
          rpcBase: result.rpc_base,
        };
      }
    }

    return {
      ok: false,
      data: null,
      error: result.detail || result.error || "Failed to fetch peers",
      rpcBase: result.rpc_base,
    };
  }

  const normalized = normalizePeers(result.data);
  return {
    ok: true,
    data: normalized,
    rpcBase: result.rpc_base,
  };
}

/**
 * Get /ipndht/summary from the gateway.
 */
export async function getIpndhtSummary(): Promise<ServerFetchResult<IpndhtSummaryData>> {
  console.log("[serverFetch] getIpndhtSummary() - calling gateway directly");
  const result = await proxyRpcRequest<IpndhtSummaryData>("/ipndht/summary", { timeout: 5000 });
  return normalizeRpcResponse<IpndhtSummaryData>(result);
}

/**
 * Get /ipndht/files from the gateway.
 */
export async function getIpndhtFiles(
  limit: number = 100
): Promise<ServerFetchResult<IpndhtFileRecord[]>> {
  console.log(`[serverFetch] getIpndhtFiles(${limit}) - calling gateway directly`);
  const result = await proxyRpcRequest<IpndhtFilesData>(`/ipndht/files?limit=${limit}`, {
    timeout: 5000,
  });

  if (!result.ok || !result.data) {
    return {
      ok: false,
      data: null,
      error: result.detail || result.error || "Failed to fetch files",
      rpcBase: result.rpc_base,
    };
  }

  // Handle various response shapes
  const data = result.data as IpndhtFilesData;
  const files = data.items ?? data.files ?? [];

  return {
    ok: true,
    data: files,
    rpcBase: result.rpc_base,
  };
}

/**
 * Get /ipndht/handles from the gateway.
 */
export async function getIpndhtHandles(
  limit: number = 100
): Promise<ServerFetchResult<IpndhtHandleRecord[]>> {
  console.log(`[serverFetch] getIpndhtHandles(${limit}) - calling gateway directly`);
  const result = await proxyRpcRequest<IpndhtHandlesData>(`/ipndht/handles?limit=${limit}`, {
    timeout: 5000,
  });

  if (!result.ok || !result.data) {
    return {
      ok: false,
      data: null,
      error: result.detail || result.error || "Failed to fetch handles",
      rpcBase: result.rpc_base,
    };
  }

  // Handle various response shapes
  const data = result.data as IpndhtHandlesData;
  const handles = data.items ?? data.handles ?? [];

  return {
    ok: true,
    data: handles,
    rpcBase: result.rpc_base,
  };
}

/**
 * Get the configured RPC base URL (for debugging/display).
 */
export function getRpcBase(): string {
  return getServerRpcBase();
}
