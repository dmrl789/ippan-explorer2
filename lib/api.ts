const baseUrl = process.env.NEXT_PUBLIC_IPPAN_RPC_URL ?? "http://localhost:8080";

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, init);
  if (!res.ok) {
    throw new Error(`RPC ${path} failed: ${res.status}`);
  }
  return res.json();
}
