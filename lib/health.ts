import type { HealthStatus } from "@/types/rpc";
import { safeJsonFetchWithStatus } from "@/lib/rpc";

export async function fetchHealthWithSource(): Promise<
  | { ok: true; source: "live"; health: HealthStatus }
  | { ok: false; source: "error"; error: string; errorCode?: string; health: HealthStatus | null }
> {
  const { status, data: health } = await safeJsonFetchWithStatus<HealthStatus>("/health");

  // 404 means endpoint not implemented yet
  if (status === 404) {
    return {
      ok: false,
      source: "error",
      error: "Health endpoint not available on this DevNet (404 expected)",
      errorCode: "endpoint_not_available",
      health: null,
    };
  }

  // No response means gateway is unreachable
  if (!health) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
      health: null,
    };
  }

  return { ok: true, source: "live", health };
}

