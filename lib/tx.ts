import type { Transaction } from "@/types/rpc";
import { RpcError, rpcFetch } from "@/lib/rpc";

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

export async function fetchTransactionDetail(
  hash: string
): Promise<
  | { ok: true; source: "live"; tx: Transaction }
  | { ok: true; source: "live"; tx: null }
  | { ok: false; source: "error"; error: string }
> {
  try {
    const payload = await rpcFetch<any>(`/tx/${encodeURIComponent(hash)}`);
    return { ok: true, source: "live", tx: normalizeTx(payload, hash) };
  } catch (error) {
    if (error instanceof RpcError && error.status === 404) {
      return { ok: true, source: "live", tx: null };
    }
    console.error("[tx/:hash] RPC error", error);
    return { ok: false, source: "error", error: "IPPAN devnet RPC unavailable" };
  }
}

