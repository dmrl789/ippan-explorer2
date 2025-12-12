import type { RpcSource, Transaction } from "@/types/rpc";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { getTransaction as getMockTransaction } from "@/lib/mockData";

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

export async function fetchTransactionDetail(hash: string): Promise<{ source: RpcSource; tx?: Transaction }> {
  const rpcBase = getRpcBaseUrl();
  if (rpcBase) {
    try {
      const res = await fetch(`${rpcBase}/tx/${encodeURIComponent(hash)}`);
      if (res.ok) {
        const payload = await res.json();
        return { source: "rpc", tx: normalizeTx(payload, hash) };
      }
    } catch (error) {
      console.warn("Falling back to mock tx due to RPC error", error);
    }
  }

  const tx = await getMockTransaction(hash);
  return { source: "mock", tx };
}

