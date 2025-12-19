import type { HealthStatus } from "@/types/rpc";
import { safeJsonFetch } from "@/lib/rpc";

export async function fetchHealthWithSource(): Promise<
  | { ok: true; source: "live"; health: HealthStatus }
  | { ok: false; source: "error"; error: string; health: HealthStatus | null }
> {
  const health = await safeJsonFetch<HealthStatus>("/health");
  if (!health) {
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable", health: null };
  }
  return { ok: true, source: "live", health };
}

