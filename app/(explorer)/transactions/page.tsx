"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { RpcErrorBanner } from "@/components/common/RpcErrorBanner";
import { ResponsiveTable } from "@/components/common/ResponsiveTable";
import { HashCell, HashCellCompact } from "@/components/common/HashCell";
import { ResponsiveStatusBadge } from "@/components/common/StatusBadge";
import { JsonPanel } from "@/components/common/JsonPanel";
import { type TxRecentItem, type TxStatus, getStatusLabel } from "@/lib/normalize";
import { formatTimestamp, shortenHash } from "@/lib/format";
import { IPPAN_RPC_BASE } from "@/lib/rpc";

const STATUS_FILTERS: TxStatus[] = ["mempool", "included", "finalized", "rejected", "pruned"];

interface TransactionsResponse {
  ok: boolean;
  data?: TxRecentItem[];
  error?: string;
  error_code?: string;
  detail?: string;
  meta?: Record<string, unknown>;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TxRecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [source, setSource] = useState<"live" | "error">("live");
  const [meta, setMeta] = useState<Record<string, unknown> | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<TxStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Fetch transactions
  const fetchTransactions = useCallback(async (currentLimit: number = 50) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/rpc/tx/recent?limit=${currentLimit}`, {
        cache: "no-store",
      });
      
      const data: TransactionsResponse = await res.json();
      
      // Defensive parsing: handle multiple response shapes
      // - { ok: true, data: [...] }
      // - { ok: true, txs: [...] }
      // - { data: { data: [...] } } (double-wrapped)
      // - Direct array (legacy)
      const rawTxs = 
        Array.isArray(data?.data) ? data.data :
        Array.isArray((data as any)?.txs) ? (data as any).txs :
        Array.isArray((data as any)?.data?.data) ? (data as any).data.data :
        Array.isArray(data) ? data :
        [];
      
      if (rawTxs.length > 0 || data.ok) {
        // Normalize the response data
        const txs = rawTxs.map(normalizeTransaction);
        setTransactions(txs);
        setSource("live");
        setMeta(data.meta || null);
      } else {
        setError(data.detail || data.error || "Failed to fetch transactions");
        setErrorCode(data.error_code);
        setSource("error");
        setTransactions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setErrorCode("FETCH_ERROR");
      setSource("error");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchTransactions(50);
  }, [fetchTransactions]);

  const handleLoadMore = () => {
    const newLimit = Math.min(transactions.length + 50, 200);
    fetchTransactions(newLimit);
  };
  
  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let result = transactions;
    
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter(tx => tx.status === statusFilter);
    }
    
    // Search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter(tx => 
        tx.tx_id.toLowerCase().includes(search) ||
        tx.from?.toLowerCase().includes(search) ||
        tx.to?.toLowerCase().includes(search) ||
        tx.included?.block_hash?.toLowerCase().includes(search)
      );
    }
    
    return result;
  }, [transactions, statusFilter, debouncedSearch]);
  
  // Handle search for tx_id navigation
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.startsWith("0x") && searchQuery.length > 20) {
      // Looks like a hash - navigate to detail page
      router.push(`/tx/${searchQuery}`);
    }
  };
  
  const handleRowClick = (tx: TxRecentItem) => {
    if (tx.tx_id) {
      router.push(`/tx/${tx.tx_id}`);
    }
  };
  
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Transactions" 
        description="Recent transactions from DevNet"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTransactions(50)}
              disabled={loading}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <a
              href="/api/rpc/debug"
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
            >
              Debug RPC
            </a>
          </div>
        }
      />
      
      {/* Search and Filters */}
      <Card>
        <div className="space-y-4">
          {/* Search bar */}
          <div className="sticky top-0 z-10 bg-slate-950 pb-2 -mt-2 pt-2">
            <form onSubmit={handleSearchSubmit}>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by tx hash, address, or block hash..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 shadow-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>
          </div>
          
          {/* Status filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-2 sm:flex-wrap -mx-2 px-2 sm:mx-0 sm:px-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition ${
                statusFilter === "all"
                  ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50"
                  : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200"
              }`}
            >
              All ({transactions.length})
            </button>
            {STATUS_FILTERS.map((status) => {
              const count = transactions.filter(tx => tx.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition ${
                    statusFilter === status
                      ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200"
                  }`}
                >
                  {getStatusLabel(status)} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </Card>
      
      {/* Error Banner */}
      {error && (
        <RpcErrorBanner
          error={{
            error,
            errorCode,
            rpcBase: IPPAN_RPC_BASE,
            path: "/tx/recent",
          }}
          context="Transactions"
          showDebugLink={true}
        />
      )}
      
      {/* Transactions List */}
      <Card 
        title={`Transactions ${filteredTransactions.length !== transactions.length ? `(${filteredTransactions.length} filtered)` : ""}`}
        headerSlot={<SourceBadge source={source} />}
      >
        <ResponsiveTable
          data={filteredTransactions}
          loading={loading}
          keyExtractor={(tx) => tx.tx_id}
          emptyMessage={
            transactions.length === 0 
              ? "No transactions yet" 
              : "No transactions match the current filters"
          }
          emptyDescription={
            transactions.length === 0
              ? "The DevNet may not have any transactions recorded yet."
              : "Try adjusting your search or status filter."
          }
          onRowClick={handleRowClick}
          columns={[
            {
              key: "tx_id",
              header: "Transaction",
              mobilePriority: 1,
              render: (tx) => (
                <div className="flex items-center gap-2">
                  <Link 
                    href={`/tx/${tx.tx_id}`}
                    className="text-emerald-300 hover:text-emerald-200 font-mono text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {shortenHash(tx.tx_id, 8)}
                  </Link>
                </div>
              ),
              renderMobile: (tx) => (
                <HashCellCompact value={tx.tx_id} href={`/tx/${tx.tx_id}`} />
              ),
            },
            {
              key: "status",
              header: "Status",
              mobilePriority: 2,
              render: (tx) => <ResponsiveStatusBadge status={tx.status} />,
            },
            {
              key: "type",
              header: "Type",
              mobilePriority: 5,
              hideOnMobile: true,
              render: (tx) => (
                <span className="text-xs text-slate-400">
                  {tx.type || "—"}
                </span>
              ),
            },
            {
              key: "included",
              header: "Block",
              mobilePriority: 3,
              render: (tx) => {
                if (!tx.included?.block_hash) {
                  return <span className="text-slate-500">—</span>;
                }
                return (
                  <Link
                    href={`/blocks/${tx.included.block_hash}`}
                    className="text-emerald-300 hover:text-emerald-200 font-mono text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {shortenHash(tx.included.block_hash, 6)}
                  </Link>
                );
              },
              renderMobile: (tx) => {
                if (!tx.included?.block_hash) {
                  return <span className="text-slate-500">—</span>;
                }
                return (
                  <HashCellCompact 
                    value={tx.included.block_hash} 
                    chars={6}
                    href={`/blocks/${tx.included.block_hash}`} 
                  />
                );
              },
            },
            {
              key: "round_id",
              header: "Round",
              mobilePriority: 4,
              hideOnMobile: true,
              render: (tx) => (
                <span className="text-xs text-slate-400">
                  {tx.included?.round_id ?? "—"}
                </span>
              ),
            },
            {
              key: "first_seen",
              header: "First Seen",
              mobilePriority: 6,
              hideOnMobile: true,
              render: (tx) => (
                <span className="text-xs text-slate-400">
                  {tx.first_seen_ts ? formatTimestamp(tx.first_seen_ts) : tx.first_seen_ms ? new Date(tx.first_seen_ms).toLocaleString() : "—"}
                </span>
              ),
            },
            {
              key: "rejected",
              header: "",
              mobilePriority: 99,
              hideOnMobile: true,
              render: (tx) => {
                if (tx.status !== "rejected" || !tx.rejected_reason) return null;
                return (
                  <span 
                    className="text-xs text-red-400 truncate max-w-[100px]"
                    title={tx.rejected_reason}
                  >
                    {tx.rejected_reason}
                  </span>
                );
              },
            },
          ]}
        />
        
        {/* Load More Button */}
        {transactions.length > 0 && transactions.length < 200 && (
          <div className="mt-4 flex justify-center border-t border-slate-800 pt-4">
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:border-emerald-500/50 hover:text-emerald-100 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Load More"}
            </button>
          </div>
        )}
      </Card>
      
      {/* Meta info */}
      {meta && (
        <JsonPanel 
          data={meta} 
          title="Response Metadata" 
        />
      )}
    </div>
  );
}

// Normalize API response to TxRecentItem
function normalizeTransaction(raw: unknown): TxRecentItem {
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
  
  const normalizeStatus = (raw: string): TxStatus => {
    const lower = raw.toLowerCase().trim();
    if (lower === "mempool" || lower === "pending" || lower === "submitted") return "mempool";
    if (lower === "included" || lower === "in_block") return "included";
    if (lower === "finalized" || lower === "confirmed" || lower === "final") return "finalized";
    if (lower === "rejected" || lower === "failed" || lower === "invalid") return "rejected";
    if (lower === "pruned" || lower === "expired" || lower === "dropped") return "pruned";
    return "unknown";
  };
  
  return {
    tx_id: txId,
    status: normalizeStatus(statusRaw),
    status_raw: statusRaw || undefined,
    first_seen_ts: (item.first_seen_ts as string) ?? (item.timestamp as string),
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
