export function getRpcBaseUrl(): string | undefined {
  const rawBase =
    process.env.NEXT_PUBLIC_NODE_RPC?.trim() ||
    process.env.VITE_NODE_RPC?.trim() ||
    process.env.NEXT_PUBLIC_IPPAN_RPC_URL?.trim() ||
    process.env.IPPAN_RPC_URL?.trim();

  if (!rawBase) return undefined;
  return rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
}

export function buildRpcUrl(path: string): string {
  const base = getRpcBaseUrl();
  if (!base) return path;
  return `${base}${path}`;
}

export function getP2pBaseUrl(): string | undefined {
  const rawBase =
    process.env.NEXT_PUBLIC_NODE_P2P?.trim() ||
    process.env.VITE_NODE_P2P?.trim() ||
    process.env.NEXT_PUBLIC_IPPAN_P2P_URL?.trim() ||
    process.env.IPPAN_P2P_URL?.trim();

  if (!rawBase) return undefined;
  return rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
}
