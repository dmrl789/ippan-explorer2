import { buildRpcUrl } from "./rpcBase";

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildRpcUrl(path), init);
  if (!res.ok) {
    throw new Error(`RPC ${path} failed: ${res.status}`);
  }
  return res.json();
}
