import type { AiStatus } from "@/types/rpc";
import { safeJsonFetchWithStatus } from "@/lib/rpc";

export async function fetchAiStatusWithSource(): Promise<
  | { ok: true; source: "live"; ai: AiStatus; aiAvailable: true }
  | { ok: true; source: "missing"; ai: null; aiAvailable: false; message: string }
  | { ok: false; source: "error"; error: string; ai: null; aiAvailable: false }
> {
  const { status, data } = await safeJsonFetchWithStatus<AiStatus>("/ai/status");

  if (status === 404) {
    return {
      ok: true,
      source: "missing",
      ai: null,
      aiAvailable: false,
      message: "AI metrics are not exposed on this devnet yet.",
    };
  }

  if (!data) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      ai: null,
      aiAvailable: false,
    };
  }

  return { ok: true, source: "live", ai: data, aiAvailable: true };
}

