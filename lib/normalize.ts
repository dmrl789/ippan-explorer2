/**
 * Centralized schema normalization layer for DevNet RPC responses.
 * 
 * All pages should use ONLY these normalized types and never assume
 * raw RPC fields exist. This ensures resilience to schema drift.
 */

// =============================================================================
// Normalized Types
// =============================================================================

export type TxStatus = 
  | "mempool" 
  | "included" 
  | "finalized" 
  | "rejected" 
  | "pruned" 
  | "unknown";

export interface TxRecentItem {
  tx_id: string;
  status: TxStatus;
  status_raw?: string;
  first_seen_ts?: string;
  first_seen_ms?: number;
  included?: {
    block_hash?: string;
    round_id?: number | string;
    position?: number;
  };
  rejected_reason?: string;
  // Optional fields for display
  type?: string;
  from?: string;
  to?: string;
  amount?: number;
  fee?: number;
}

export interface TxDetail {
  tx_id: string;
  status: TxStatus;
  status_raw?: string;
  first_seen_ts?: string;
  first_seen_ms?: number;
  included?: {
    block_hash?: string;
    round_id?: number | string;
    position?: number;
    included_ts?: string;
    included_ms?: number;
  };
  finalized?: {
    finalized_ts?: string;
    finalized_ms?: number;
  };
  rejected_reason?: string;
  // Transaction content
  type?: string;
  from?: string;
  to?: string;
  amount?: number;
  amount_atomic?: string;
  fee?: number;
  hash_timer_id?: string;
  payload?: unknown;
  raw?: unknown;
}

export interface BlockSummary {
  block_hash: string;
  prev_block_hash?: string;
  round_id?: number | string;
  hashtimer?: string;
  tx_count?: number;
  timestamp?: string;
  ippan_time_ms?: number;
}

export interface BlockDetail extends BlockSummary {
  tx_ids?: string[];
  transactions?: TxDetail[];
  header?: Record<string, unknown>;
  raw?: unknown;
}

export interface RoundDetail {
  round_id: number | string;
  round_hash?: string;
  prev_round_hash?: string;
  round_hashtimer?: string;
  start_hashtimer?: string;
  end_hashtimer?: string;
  included_blocks?: string[];
  block_count?: number;
  ordered_tx_ids?: string[];
  tx_count?: number;
  finalized?: boolean;
  finality_ms?: number;
  raw?: unknown;
}

// =============================================================================
// Status Normalization
// =============================================================================

function normalizeStatus(raw: unknown): TxStatus {
  if (!raw || typeof raw !== "string") return "unknown";
  
  const lower = raw.toLowerCase().trim();
  
  if (lower === "mempool" || lower === "pending" || lower === "submitted") {
    return "mempool";
  }
  if (lower === "included" || lower === "in_block") {
    return "included";
  }
  if (lower === "finalized" || lower === "confirmed" || lower === "final") {
    return "finalized";
  }
  if (lower === "rejected" || lower === "failed" || lower === "invalid") {
    return "rejected";
  }
  if (lower === "pruned" || lower === "expired" || lower === "dropped") {
    return "pruned";
  }
  
  return "unknown";
}

// =============================================================================
// Transaction Normalization
// =============================================================================

/**
 * Normalize recent transaction list response.
 * Accepts: array | { items: [] } | { txs: [] } | { transactions: [] }
 */
export function normalizeTxRecent(response: unknown): TxRecentItem[] {
  if (!response) return [];
  
  // Handle proxy wrapper
  const data = unwrap(response);
  
  // Find the array
  let rawList: unknown[];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    rawList = 
      (Array.isArray(obj.items) ? obj.items : null) ??
      (Array.isArray(obj.txs) ? obj.txs : null) ??
      (Array.isArray(obj.transactions) ? obj.transactions : null) ??
      [];
  } else {
    return [];
  }
  
  return rawList.map((item) => normalizeTxRecentItem(item));
}

function normalizeTxRecentItem(raw: unknown): TxRecentItem {
  if (!raw || typeof raw !== "object") {
    return { tx_id: "", status: "unknown" };
  }
  
  const item = raw as Record<string, unknown>;
  
  const txId = 
    (item.tx_id as string) ?? 
    (item.hash as string) ?? 
    (item.tx_hash as string) ?? 
    (item.id as string) ?? 
    "";
  
  const statusRaw = 
    (item.status_v2 as string) ?? 
    (item.status as string) ?? 
    "";
  
  const included = item.included as Record<string, unknown> | undefined;
  
  return {
    tx_id: txId,
    status: normalizeStatus(statusRaw),
    status_raw: statusRaw || undefined,
    first_seen_ts: (item.first_seen_ts as string) ?? (item.timestamp as string) ?? (item.created_at as string),
    first_seen_ms: (item.first_seen_ms as number) ?? (item.ippan_time_ms as number),
    included: included ? {
      block_hash: (included.block_hash as string) ?? (item.block_hash as string),
      round_id: (included.round_id as number | string) ?? (item.round_id as number | string),
      position: included.position as number,
    } : (item.block_hash ? {
      block_hash: item.block_hash as string,
      round_id: item.round_id as number | string,
    } : undefined),
    rejected_reason: (item.rejected_reason as string) ?? (item.error as string),
    type: item.type as string,
    from: item.from as string,
    to: item.to as string,
    amount: item.amount as number,
    fee: item.fee as number,
  };
}

/**
 * Normalize transaction detail response.
 */
export function normalizeTxDetail(response: unknown): TxDetail | null {
  if (!response) return null;
  
  // Handle proxy wrapper
  const data = unwrap(response);
  
  if (!data || typeof data !== "object") return null;
  
  const item = data as Record<string, unknown>;
  
  // Handle nested { tx: {...} } or flat structure
  const tx = (item.tx as Record<string, unknown>) ?? item;
  
  const txId = 
    (tx.tx_id as string) ?? 
    (tx.hash as string) ?? 
    (tx.tx_hash as string) ?? 
    (tx.id as string) ?? 
    "";
  
  if (!txId) return null;
  
  const statusRaw = 
    (tx.status_v2 as string) ?? 
    (tx.status as string) ?? 
    "";
  
  const included = tx.included as Record<string, unknown> | undefined;
  const finalized = tx.finalized as Record<string, unknown> | undefined;
  
  return {
    tx_id: txId,
    status: normalizeStatus(statusRaw),
    status_raw: statusRaw || undefined,
    first_seen_ts: (tx.first_seen_ts as string) ?? (tx.timestamp as string) ?? (tx.created_at as string),
    first_seen_ms: (tx.first_seen_ms as number) ?? (tx.ippan_time_ms as number),
    included: included ? {
      block_hash: (included.block_hash as string) ?? (tx.block_hash as string),
      round_id: (included.round_id as number | string) ?? (tx.round_id as number | string),
      position: included.position as number,
      included_ts: included.included_ts as string,
      included_ms: included.included_ms as number,
    } : (tx.block_hash ? {
      block_hash: tx.block_hash as string,
      round_id: tx.round_id as number | string,
    } : undefined),
    finalized: finalized ? {
      finalized_ts: finalized.finalized_ts as string,
      finalized_ms: finalized.finalized_ms as number,
    } : undefined,
    rejected_reason: (tx.rejected_reason as string) ?? (tx.error as string),
    type: (tx.type as string) ?? (tx.tx_type as string),
    from: (tx.from as string) ?? (tx.sender as string),
    to: (tx.to as string) ?? (tx.recipient as string),
    amount: tx.amount as number,
    amount_atomic: (tx.amount_atomic as string) ?? (tx.amountAtomic as string),
    fee: tx.fee as number,
    hash_timer_id: (tx.hash_timer_id as string) ?? (tx.hashTimer as string) ?? (tx.hashtimer as string),
    payload: tx.payload,
    raw: tx,
  };
}

// =============================================================================
// Block Normalization
// =============================================================================

/**
 * Normalize block list response.
 */
export function normalizeBlockList(response: unknown): BlockSummary[] {
  if (!response) return [];
  
  // Handle proxy wrapper
  const data = unwrap(response);
  
  // Find the array
  let rawList: unknown[];
  if (Array.isArray(data)) {
    rawList = data;
  } else if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    rawList = 
      (Array.isArray(obj.blocks) ? obj.blocks : null) ??
      (Array.isArray(obj.items) ? obj.items : null) ??
      [];
  } else {
    return [];
  }
  
  return rawList.map((item) => normalizeBlockSummary(item));
}

function normalizeBlockSummary(raw: unknown): BlockSummary {
  if (!raw || typeof raw !== "object") {
    return { block_hash: "" };
  }
  
  const item = raw as Record<string, unknown>;
  const header = item.header as Record<string, unknown> | undefined;
  
  return {
    block_hash: 
      (item.block_hash as string) ?? 
      (item.hash as string) ?? 
      (header?.block_hash as string) ?? 
      (item.id as string) ?? 
      "",
    prev_block_hash: 
      (header?.prev_block_hash as string) ?? 
      (item.prev_block_hash as string) ?? 
      (item.parent_hash as string),
    round_id: 
      (item.round_id as number | string) ?? 
      (header?.round_id as number | string),
    hashtimer: 
      (item.hash_timer_id as string) ?? 
      (item.hashtimer as string) ?? 
      (header?.hash_timer_id as string),
    tx_count: 
      (item.tx_count as number) ?? 
      (Array.isArray(item.tx_ids) ? item.tx_ids.length : undefined) ??
      (Array.isArray(item.transactions) ? item.transactions.length : undefined),
    timestamp: 
      (item.timestamp as string) ?? 
      (header?.timestamp as string),
    ippan_time_ms: 
      (item.ippan_time_ms as number) ?? 
      (header?.ippan_time_ms as number),
  };
}

/**
 * Normalize block detail response.
 */
export function normalizeBlock(response: unknown): BlockDetail | null {
  if (!response) return null;
  
  // Handle proxy wrapper
  const data = unwrap(response);
  
  if (!data || typeof data !== "object") return null;
  
  const item = data as Record<string, unknown>;
  
  // Handle nested { block: {...} } or flat structure
  const block = (item.block as Record<string, unknown>) ?? item;
  const header = block.header as Record<string, unknown> | undefined;
  
  const summary = normalizeBlockSummary(block);
  
  if (!summary.block_hash) return null;
  
  // Extract transaction IDs
  let txIds: string[] | undefined;
  if (Array.isArray(block.tx_ids)) {
    txIds = block.tx_ids.filter((id): id is string => typeof id === "string");
  } else if (Array.isArray(block.transactions)) {
    // Extract IDs from full transaction objects
    txIds = block.transactions
      .map((tx: unknown) => {
        if (typeof tx === "string") return tx;
        if (typeof tx === "object" && tx !== null) {
          const t = tx as Record<string, unknown>;
          return (t.tx_id as string) ?? (t.hash as string) ?? (t.id as string);
        }
        return undefined;
      })
      .filter((id): id is string => typeof id === "string");
  }
  
  return {
    ...summary,
    tx_ids: txIds,
    header: header,
    raw: block,
  };
}

// =============================================================================
// Round Normalization
// =============================================================================

/**
 * Normalize round detail response.
 */
export function normalizeRound(response: unknown): RoundDetail | null {
  if (!response) return null;
  
  // Handle proxy wrapper
  const data = unwrap(response);
  
  if (!data || typeof data !== "object") return null;
  
  const item = data as Record<string, unknown>;
  
  // Handle nested { round: {...} } or flat structure
  const round = (item.round as Record<string, unknown>) ?? item;
  
  const roundId = 
    (round.round_id as number | string) ?? 
    (round.id as number | string) ?? 
    (round.height as number);
  
  if (roundId === undefined || roundId === null) return null;
  
  // Extract block hashes
  let includedBlocks: string[] | undefined;
  if (Array.isArray(round.included_blocks)) {
    includedBlocks = round.included_blocks.filter((b): b is string => typeof b === "string");
  } else if (Array.isArray(round.blocks)) {
    includedBlocks = round.blocks
      .map((b: unknown) => {
        if (typeof b === "string") return b;
        if (typeof b === "object" && b !== null) {
          const block = b as Record<string, unknown>;
          return (block.block_hash as string) ?? (block.hash as string);
        }
        return undefined;
      })
      .filter((b): b is string => typeof b === "string");
  }
  
  // Extract tx IDs
  let orderedTxIds: string[] | undefined;
  if (Array.isArray(round.ordered_tx_ids)) {
    orderedTxIds = round.ordered_tx_ids.filter((id): id is string => typeof id === "string");
  } else if (Array.isArray(round.tx_ids)) {
    orderedTxIds = round.tx_ids.filter((id): id is string => typeof id === "string");
  }
  
  return {
    round_id: roundId,
    round_hash: (round.round_hash as string) ?? (round.hash as string),
    prev_round_hash: round.prev_round_hash as string,
    round_hashtimer: 
      (round.round_hashtimer as string) ?? 
      (round.hash_timer_id as string) ?? 
      (round.hashtimer as string),
    start_hashtimer: round.start_hashtimer as string,
    end_hashtimer: round.end_hashtimer as string,
    included_blocks: includedBlocks,
    block_count: 
      (round.block_count as number) ?? 
      (includedBlocks?.length),
    ordered_tx_ids: orderedTxIds,
    tx_count: 
      (round.tx_count as number) ?? 
      (orderedTxIds?.length),
    finalized: round.finalized as boolean,
    finality_ms: round.finality_ms as number,
    raw: round,
  };
}

// =============================================================================
// Display Helpers
// =============================================================================

/**
 * Get a display-friendly status badge color class.
 */
export function getStatusBadgeClass(status: TxStatus): string {
  switch (status) {
    case "finalized":
      return "bg-emerald-900/50 text-emerald-300 border-emerald-700/50";
    case "included":
      return "bg-blue-900/50 text-blue-300 border-blue-700/50";
    case "mempool":
      return "bg-amber-900/50 text-amber-300 border-amber-700/50";
    case "rejected":
      return "bg-red-900/50 text-red-300 border-red-700/50";
    case "pruned":
      return "bg-slate-800/50 text-slate-400 border-slate-700/50";
    default:
      return "bg-slate-800/50 text-slate-400 border-slate-700/50";
  }
}

/**
 * Get a display-friendly status label.
 */
export function getStatusLabel(status: TxStatus): string {
  switch (status) {
    case "finalized":
      return "Finalized";
    case "included":
      return "Included";
    case "mempool":
      return "Mempool";
    case "rejected":
      return "Rejected";
    case "pruned":
      return "Pruned";
    default:
      return "Unknown";
  }
}

/**
 * Safe field accessor - returns placeholder for missing fields.
 */
export function safeDisplay<T>(value: T | undefined | null, placeholder = "—"): string {
  if (value === undefined || value === null || value === "") {
    return placeholder;
  }
  return String(value);
}

/**
 * Unwrap a proxy response in the shape `{ ok: true, data: ... }` or `{ ok: false, ... }`.
 * If the wrapper isn't present, returns the input as-is.
 *
 * Must be defensive: never throws.
 */
function unwrap<T = unknown>(x: unknown): T {
  try {
    if (!x || typeof x !== "object") return x as T;
    if (!("ok" in x)) return x as T;
    const obj = x as { ok?: unknown; data?: unknown };
    if (obj.ok === true && "data" in obj) {
      return obj.data as T;
    }
    return x as T;
  } catch {
    return x as T;
  }
}
