import { safeJsonFetchWithStatus } from "@/lib/rpc";
import { 
  normalizeTxRecent, 
  normalizeTxDetail, 
  type TxRecentItem, 
  type TxDetail,
  type TxStatus 
} from "@/lib/normalize";

export type { TxRecentItem, TxDetail, TxStatus } from "@/lib/normalize";

export async function fetchRecentTransactions(
  limit: number = 50
): Promise<
  | { ok: true; source: "live"; transactions: TxRecentItem[]; meta?: Record<string, unknown> }
  | { ok: false; source: "error"; error: string; errorCode?: string; transactions: TxRecentItem[] }
> {
  const { status, data: payload } = await safeJsonFetchWithStatus<unknown>(
    `/tx/recent?limit=${Math.min(limit, 200)}`
  );
  
  // Handle network/connection errors
  if (status === null) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable",
      transactions: []
    };
  }
  
  // 404 means endpoint not implemented
  if (status === 404) {
    return {
      ok: false,
      source: "error",
      error: "Transaction list endpoint not available on this DevNet (404).",
      errorCode: "endpoint_not_available",
      transactions: []
    };
  }
  
  if (!payload) {
    return {
      ok: false,
      source: "error",
      error: `Unexpected error fetching transactions (HTTP ${status})`,
      errorCode: "unknown_error",
      transactions: []
    };
  }

  // Normalize the response
  const transactions = normalizeTxRecent(payload);
  
  // Extract meta if available
  const meta = (payload as Record<string, unknown>)?.meta as Record<string, unknown> | undefined;
  
  return { 
    ok: true, 
    source: "live", 
    transactions,
    meta
  };
}

export async function fetchTransactionDetail(
  hash: string
): Promise<
  | { ok: true; source: "live"; tx: TxDetail }
  | { ok: true; source: "live"; tx: null; notFoundReason?: string }
  | { ok: false; source: "error"; error: string; errorCode?: string }
> {
  const { status, data } = await safeJsonFetchWithStatus<unknown>(`/tx/${encodeURIComponent(hash)}`);
  
  if (status === null) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable"
    };
  }
  
  if (status === 404) {
    return {
      ok: true,
      source: "live",
      tx: null,
      notFoundReason: "Transaction not found on this DevNet. The transaction may not exist, or the DevNet may not have recorded it yet."
    };
  }
  
  if (!data) {
    return {
      ok: false,
      source: "error",
      error: `Unexpected error fetching transaction (HTTP ${status})`,
      errorCode: "unknown_error"
    };
  }
  
  const tx = normalizeTxDetail(data);
  
  if (!tx) {
    return {
      ok: true,
      source: "live",
      tx: null,
      notFoundReason: "Transaction data could not be parsed. The RPC response format may have changed."
    };
  }
  
  return { ok: true, source: "live", tx };
}

export async function fetchTransactionStatus(
  hash: string
): Promise<
  | { ok: true; source: "live"; status: TxStatus; raw?: unknown }
  | { ok: true; source: "live"; status: null; notFoundReason?: string }
  | { ok: false; source: "error"; error: string; errorCode?: string }
> {
  const { status: httpStatus, data } = await safeJsonFetchWithStatus<unknown>(
    `/tx/status/${encodeURIComponent(hash)}`
  );
  
  if (httpStatus === null) {
    return {
      ok: false,
      source: "error",
      error: "Gateway RPC unavailable (connection failed)",
      errorCode: "gateway_unreachable"
    };
  }
  
  if (httpStatus === 404) {
    return {
      ok: true,
      source: "live",
      status: null,
      notFoundReason: "Transaction status not found."
    };
  }
  
  if (!data) {
    return {
      ok: false,
      source: "error",
      error: `Unexpected error fetching transaction status (HTTP ${httpStatus})`,
      errorCode: "unknown_error"
    };
  }
  
  // Extract status from response
  const response = data as Record<string, unknown>;
  const statusStr = (response.status_v2 as string) ?? (response.status as string) ?? "unknown";
  
  // Use the normalize helper
  const tx = normalizeTxDetail(data);
  
  return { 
    ok: true, 
    source: "live", 
    status: tx?.status ?? "unknown",
    raw: data
  };
}
