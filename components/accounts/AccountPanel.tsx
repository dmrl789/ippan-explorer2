"use client";

import { useMemo, useState } from "react";
import type { AccountSummary, PaymentEntry } from "@/types/rpc";
import SimpleTable from "@/components/tables/SimpleTable";
import { formatAmount, formatTimestamp, shortenHash } from "@/lib/format";

interface AccountPanelProps {
  account: AccountSummary;
  payments: PaymentEntry[];
}

const PAGE_SIZE = 5;

export default function AccountPanel({ account, payments }: AccountPanelProps) {
  const [tab, setTab] = useState<"overview" | "payments">("overview");
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));

  const paginatedPayments = useMemo(() => {
    const start = page * PAGE_SIZE;
    return payments.slice(start, start + PAGE_SIZE);
  }, [page, payments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setTab("overview")}
          className={`rounded-full px-4 py-1 text-sm font-medium transition ${
            tab === "overview" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-900/60 text-slate-400"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setTab("payments")}
          className={`rounded-full px-4 py-1 text-sm font-medium transition ${
            tab === "payments" ? "bg-emerald-500/20 text-emerald-200" : "bg-slate-900/60 text-slate-400"
          }`}
        >
          Payments
        </button>
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <OverviewItem label="Balance" value={formatAmount(account.balance)} hint={`${account.balanceAtomic} atomic`} />
          <OverviewItem label="Nonce" value={account.nonce.toString()} />
          <OverviewItem label="Handles" value={account.handles?.join(", ") ?? "—"} />
        </div>
      )}

      {tab === "payments" && (
        <div className="space-y-3">
          <SimpleTable
            data={paginatedPayments}
            columns={[
              { key: "hash", header: "Tx", render: (row) => shortenHash(row.hash) },
              { key: "timestamp", header: "Timestamp", render: (row) => formatTimestamp(row.timestamp) },
              { key: "direction", header: "Direction" },
              { key: "amount", header: "Amount", render: (row) => formatAmount(row.amount) },
              { key: "fee", header: "Fee", render: (row) => `${row.fee} IPN` },
              { key: "counterparty", header: "Counterparty", render: (row) => shortenHash(row.counterparty) }
            ]}
          />
          <div className="flex items-center justify-between text-sm text-slate-400">
            <button
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0}
              className="rounded-xl border border-slate-800 px-3 py-1 text-slate-200 disabled:opacity-40"
            >
              Previous
            </button>
            <p>
              Page {page + 1} / {totalPages}
            </p>
            <button
              onClick={() => setPage((value) => (value + 1 < totalPages ? value + 1 : value))}
              disabled={page + 1 >= totalPages}
              className="rounded-xl border border-slate-800 px-3 py-1 text-slate-200 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewItem({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-50">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
