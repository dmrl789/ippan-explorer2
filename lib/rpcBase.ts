const rawBase = process.env.NEXT_PUBLIC_IPPAN_RPC_URL?.trim();

export function getRpcBaseUrl(): string | undefined {
  if (!rawBase) return undefined;
  return rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase;
}

export function buildRpcUrl(path: string): string {
  const base = getRpcBaseUrl();
  if (!base) return path;
  return `${base}${path}`;
}
