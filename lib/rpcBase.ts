import { RpcError, buildRpcUrl, getEnvRpcBaseUrl, requireRpcBaseUrl, rpcFetch } from "./rpc";

export function getRpcBaseUrl(): string | undefined {
  return getEnvRpcBaseUrl();
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
