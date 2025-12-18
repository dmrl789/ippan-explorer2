import type { AiStatus } from "@/types/rpc";
import { rpcFetch } from "@/lib/rpcBase";

export async function fetchAiStatusWithSource(): Promise<
  | { ok: true; source: "live"; ai: AiStatus }
  | { ok: false; source: "error"; error: string; ai: AiStatus | null }
> {
  try {
    const ai = await rpcFetch<AiStatus>("/ai/status");
    return { ok: true, source: "live", ai };
  } catch (error) {
    console.error("[ai/status] RPC error", error);
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable", ai: null };
  }
}

