import type { HealthStatus } from "@/types/rpc";
import { rpcFetch } from "@/lib/rpcBase";

export async function fetchHealthWithSource(): Promise<
  | { ok: true; source: "live"; health: HealthStatus }
  | { ok: false; source: "error"; error: string; health: HealthStatus | null }
> {
  try {
    const health = await rpcFetch<HealthStatus>("/health");
    return { ok: true, source: "live", health };
  } catch (error) {
    console.error("[health] RPC error", error);
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable", health: null };
  }
}

