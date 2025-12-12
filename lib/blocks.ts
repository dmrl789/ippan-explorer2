import type { BlockDetail, BlockSummary, Transaction, RpcSource } from "@/types/rpc";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { getBlockById, getRecentBlocks } from "@/lib/mockData";

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

export async function fetchRecentBlocks(): Promise<{ source: RpcSource; blocks: BlockSummary[] }> {
  const rpcBase = getRpcBaseUrl();
  if (!rpcBase) {
    return { source: "mock", blocks: await getRecentBlocks() };
  }

  try {
    const res = await fetch(`${rpcBase}/blocks`);
    if (!res.ok) throw new Error(`RPC blocks failed: ${res.status}`);
    const payload = await res.json();
    const rawBlocks: any[] = Array.isArray(payload) ? payload : Array.isArray(payload?.blocks) ? payload.blocks : [];
    return { source: "rpc", blocks: rawBlocks.map((b, idx) => normalizeBlockSummary(b, String(idx))) };
  } catch (error) {
    console.warn("Falling back to mock blocks due to RPC error", error);
    return { source: "mock", blocks: await getRecentBlocks() };
  }
}

export async function fetchBlockDetail(id: string): Promise<{ source: RpcSource; block?: BlockDetail }> {
  const rpcBase = getRpcBaseUrl();
  if (rpcBase) {
    try {
      const res = await fetch(`${rpcBase}/blocks/${encodeURIComponent(id)}`);
      if (res.ok) {
        const payload = await res.json();
        return { source: "rpc", block: normalizeBlockDetail(payload, id) };
      }
    } catch (error) {
      console.warn("Block detail fetch failed; falling back to mock", error);
    }
  }

  const mock = await getBlockById(id);
  return { source: "mock", block: mock };
}

