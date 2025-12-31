import { IPPAN_RPC_BASE, RpcError, buildRpcUrl, requireRpcBaseUrl, rpcFetch, getEffectiveRpcBase } from "./rpc";

/**
 * Get the RPC base URL for display purposes.
 * This returns the direct HTTP URL (not the proxy).
 * Use for showing the user what RPC endpoint is being used.
 */
export function getRpcBaseUrl(): string {
  return IPPAN_RPC_BASE;
}

/**
 * Get the effective RPC base URL for fetching.
 * This returns the proxy URL when in browser, direct URL on server.
 */
export function getEffectiveRpcBaseUrl(): string {
  return getEffectiveRpcBase();
}

// Back-compat re-exports. New code should import from "@/lib/rpc".
export { RpcError, buildRpcUrl, requireRpcBaseUrl, rpcFetch };

export function getP2pBaseUrl(): string | undefined {
  const rawBase =
    process.env.NEXT_PUBLIC_NODE_P2P?.trim() ||
    process.env.VITE_NODE_P2P?.trim() ||
    process.env.NEXT_PUBLIC_IPPAN_P2P_URL?.trim() ||
    process.env.IPPAN_P2P_URL?.trim();

  if (!rawBase) return undefined;
  return rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
}
