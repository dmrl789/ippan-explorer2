import type { AiStatus } from "@/types/rpc";
import { RpcError, rpcFetch } from "@/lib/rpc";

export async function fetchAiStatusWithSource(): Promise<
  | { ok: true; source: "live"; ai: AiStatus; aiAvailable: true }
  | { ok: true; source: "missing"; ai: null; aiAvailable: false; message: string }
  | { ok: false; source: "error"; error: string; ai: null; aiAvailable: false }
> {
  try {
    const ai = await rpcFetch<AiStatus>("/ai/status");
    return { ok: true, source: "live", ai, aiAvailable: true };
  } catch (error) {
    if (error instanceof RpcError && error.status === 404) {
      return {
        ok: true,
        source: "missing",
        ai: null,
        aiAvailable: false,
        message: "AI metrics are not exposed on this devnet yet.",
      };
    }
    console.error("[ai/status] RPC error", error);
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable", ai: null, aiAvailable: false };
  }
}

