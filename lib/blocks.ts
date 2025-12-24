import type { BlockDetail, BlockSummary, Transaction } from "@/types/rpc";
import { safeJsonFetchWithStatus } from "@/lib/rpc";

function normalizeTx(record: any, fallbackHash: string): Transaction {
  return {
    hash: typeof record?.hash === "string" ? record.hash : fallbackHash,
    from: typeof record?.from === "string" ? record.from : "",
    to: typeof record?.to === "string" ? record.to : "",
    amount: typeof record?.amount === "number" ? record.amount : 0,
    amountAtomic: typeof record?.amountAtomic === "string" ? record.amountAtomic : typeof record?.amount_atomic === "string" ? record.amount_atomic : "0",
    fee: typeof record?.fee === "number" ? record.fee : 0,
    timestamp: typeof record?.timestamp === "string" ? record.timestamp : new Date().toISOString(),
    hashTimer: typeof record?.hashTimer === "string" ? record.hashTimer : typeof record?.hash_timer_id === "string" ? record.hash_timer_id : "",
    type: typeof record?.type === "string" ? record.type : "tx",
    status: typeof record?.status === "string" ? record.status : "unknown",
    blockId: typeof record?.blockId === "string" ? record.blockId : typeof record?.block_id === "string" ? record.block_id : undefined,
    ippan_time_us: typeof record?.ippan_time_us === "string" ? record.ippan_time_us : undefined,
    ippan_time_ms: typeof record?.ippan_time_ms === "number" ? record.ippan_time_ms : undefined
  };
}

function normalizeBlockSummary(record: any, fallbackId: string): BlockSummary {
  const id = typeof record?.id === "string" ? record.id : typeof record?.height === "number" ? String(record.height) : fallbackId;
  return {
    id,
    hash: typeof record?.hash === "string" ? record.hash : "",
    timestamp: typeof record?.timestamp === "string" ? record.timestamp : new Date().toISOString(),
    hashTimer: typeof record?.hashTimer === "string" ? record.hashTimer : typeof record?.hash_timer_id === "string" ? record.hash_timer_id : "",
    txCount: typeof record?.txCount === "number" ? record.txCount : typeof record?.tx_count === "number" ? record.tx_count : 0,
    ippan_time_us: typeof record?.ippan_time_us === "string" ? record.ippan_time_us : undefined,
    ippan_time_ms: typeof record?.ippan_time_ms === "number" ? record.ippan_time_ms : undefined
  };
}

function normalizeBlockDetail(record: any, fallbackId: string): BlockDetail {
  const summary = normalizeBlockSummary(record, fallbackId);
  const parents: string[] = Array.isArray(record?.parents) ? record.parents.filter((p: any) => typeof p === "string") : [];
  const rawTxs: any[] = Array.isArray(record?.transactions) ? record.transactions : [];
  const transactions = rawTxs.map((tx, idx) => normalizeTx(tx, `${summary.hash || "0x"}${idx}`));
  return { ...summary, parents, transactions };
}

export async function fetchRecentBlocks(): Promise<
  | { ok: true; source: "live"; blocks: BlockSummary[] }
  | { ok: false; source: "error"; error: string; errorCode?: string; blocks: BlockSummary[] }
> {
  const { status, data: payload } = await safeJsonFetchWithStatus<any>("/blocks");
  
  // DevNet may not expose /blocks endpoint yet (404)
  if (status === 404) {
    return {
      ok: false,
      source: "error",
      error: "Block list endpoint not available on this DevNet (404). The node is online but does not expose /blocks yet.",
      errorCode: "endpoint_not_available",
      blocks: []
    };
  }
  
  if (!payload) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
      blocks: []
    };
  }

  const rawBlocks: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.blocks) ? payload.blocks : [];
  return { ok: true, source: "live", blocks: rawBlocks.map((b, idx) => normalizeBlockSummary(b, String(idx))) };
}

export async function fetchBlockDetail(
  id: string
): Promise<
  | { ok: true; source: "live"; block: BlockDetail }
  | { ok: true; source: "live"; block: null }
  | { ok: false; source: "error"; error: string }
> {
  const { status, data } = await safeJsonFetchWithStatus<any>(`/blocks/${encodeURIComponent(id)}`);

  if (status === 404) {
    return { ok: true, source: "live", block: null };
  }
  if (!data) {
    return { ok: false, source: "error", error: "Gateway RPC unavailable (connection failed)" };
  }

  return { ok: true, source: "live", block: normalizeBlockDetail(data, id) };
}

