import { safeJsonFetchWithStatus } from "@/lib/rpc";
import { normalizeRound, type RoundDetail } from "@/lib/normalize";

export type { RoundDetail } from "@/lib/normalize";

export async function fetchRoundDetail(
  id: string
): Promise<
  | { ok: true; source: "live"; round: RoundDetail }
  | { ok: true; source: "live"; round: null; notFoundReason?: string }
  | { ok: false; source: "error"; error: string; errorCode?: string }
> {
  const { status, data } = await safeJsonFetchWithStatus<unknown>(`/round/${encodeURIComponent(id)}`);

  if (status === null) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
    };
  }

  if (status === 404) {
    return {
      ok: true,
      source: "live",
      round: null,
      notFoundReason: "Round not found on this DevNet.",
    };
  }

  if (!data) {
    return {
      ok: false,
      source: "error",
      error: `Unexpected error fetching round (HTTP ${status})`,
      errorCode: "unknown_error",
    };
  }

  const round = normalizeRound(data);
  if (!round) {
    return {
      ok: true,
      source: "live",
      round: null,
      notFoundReason: "Round data could not be parsed. The RPC response format may have changed.",
    };
  }

  return { ok: true, source: "live", round };
}

