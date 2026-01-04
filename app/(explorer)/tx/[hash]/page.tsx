import Link from "next/link";
import type { ReactNode } from "react";
import { JsonPanel } from "@/components/common/JsonPanel";
import { SourceBadge } from "@/components/common/SourceBadge";
import { RpcErrorBanner } from "@/components/common/RpcErrorBanner";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { StatusBadge } from "@/components/common/StatusBadge";
import { HashCell } from "@/components/common/HashCell";
import { CopyButton } from "@/components/common/CopyButton";
import { fetchTransactionDetail } from "@/lib/tx";
import { formatAmount, shortenHash } from "@/lib/format";
import { formatMs, toMsFromUs } from "@/lib/ippanTime";
import { IPPAN_RPC_BASE } from "@/lib/rpc";

interface TransactionPageProps {
  params: Promise<{ hash: string }>;
}

export default async function TransactionDetailPage({ params }: TransactionPageProps) {
  const { hash } = await params;
  const result = await fetchTransactionDetail(hash);
  
  // Handle RPC errors
  if (!result.ok) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Transaction" 
          description={shortenHash(hash)} 
          actions={<BackLink />} 
        />
        <Card title="DevNet RPC Error" headerSlot={<SourceBadge source="error" />}>
          <RpcErrorBanner
            error={{
              error: result.error,
              errorCode: "errorCode" in result ? result.errorCode : undefined,
              rpcBase: IPPAN_RPC_BASE,
              path: `/tx/${hash}`,
            }}
            context="Transaction"
            showDebugLink={true}
          />
        </Card>
      </div>
    );
  }
  
  // Handle transaction not found (404 from DevNet)
  if (!result.tx) {
    const notFoundReason = "notFoundReason" in result && result.notFoundReason
      ? result.notFoundReason
      : "Transaction not found on this DevNet.";
    
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Transaction Not Found" 
          description={shortenHash(hash)} 
          actions={<BackLink />} 
        />
        <Card title="Transaction Not Found" headerSlot={<SourceBadge source="live" />}>
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4">
            <p className="text-sm text-amber-200/80">{notFoundReason}</p>
            <div className="mt-3 text-xs text-slate-500">
              <p className="font-mono break-all">Hash: {hash}</p>
              <p className="mt-1">This could mean:</p>
              <ul className="mt-1 ml-4 list-disc space-y-0.5">
                <li>The transaction hash is incorrect</li>
                <li>The transaction hasn&apos;t been processed yet</li>
                <li>The transaction was never submitted to this DevNet</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    );
  }
  
  const tx = result.tx;
  const txIppanMs =
    tx.first_seen_ms ??
    (tx.first_seen_ts ? new Date(tx.first_seen_ts).getTime() : Date.now());
  const txIso = formatMs(txIppanMs);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            Transaction
            <StatusBadge status={tx.status} />
          </span>
        }
        description={
          <span className="font-mono text-sm break-all">{shortenHash(tx.tx_id, 12)}</span>
        }
        actions={<BackLink />}
      />

      {/* Lifecycle Timeline */}
      <Card title="Transaction Lifecycle">
        <TransactionTimeline tx={tx} />
      </Card>

      {/* Transaction Summary */}
      <Card title="Transaction Details" headerSlot={<SourceBadge source={result.source} />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail 
            label="Transaction ID" 
            value={
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm break-all">{tx.tx_id}</span>
                <CopyButton text={tx.tx_id} size="xs" iconOnly />
              </div>
            } 
          />
          <Detail label="Status" value={<StatusBadge status={tx.status} />} />
          <Detail label="Type" value={tx.type || "—"} />
          
          {tx.from && (
            <Detail 
              label="From" 
              value={<HashCell value={tx.from} href={`/accounts/${tx.from}`} />}
            />
          )}
          {tx.to && (
            <Detail 
              label="To" 
              value={<HashCell value={tx.to} href={`/accounts/${tx.to}`} />}
            />
          )}
          
          {tx.amount !== undefined && (
            <Detail 
              label="Amount" 
              value={formatAmount(tx.amount)} 
              hint={tx.amount_atomic ? `${tx.amount_atomic} atomic` : undefined} 
            />
          )}
          {tx.fee !== undefined && (
            <Detail label="Fee" value={`${tx.fee} IPN`} />
          )}
          
          <Detail label="First Seen (ms)" value={txIppanMs.toLocaleString()} />
          <Detail label="UTC" value={txIso} />
          
          {tx.hash_timer_id && (
            <Detail
              label="HashTimer"
              value={
                <HashTimerValue
                  id={tx.hash_timer_id}
                  linkClassName="text-emerald-300 underline-offset-4 hover:underline"
                />
              }
            />
          )}
          
          {tx.included?.block_hash && (
            <Detail
              label="Included in Block"
              value={
                <Link href={`/blocks/${tx.included.block_hash}`} className="text-emerald-300 hover:underline">
                  {shortenHash(tx.included.block_hash, 8)}
                </Link>
              }
            />
          )}
          
          {tx.included?.round_id !== undefined && (
            <Detail
              label="Round"
              value={
                <Link href={`/round/${String(tx.included.round_id)}`} className="text-emerald-300 hover:underline">
                  #{String(tx.included.round_id)}
                </Link>
              }
            />
          )}
          
          {tx.rejected_reason && (
            <div className="sm:col-span-2">
              <Detail 
                label="Rejection Reason" 
                value={
                  <span className="text-red-300">{tx.rejected_reason}</span>
                }
              />
            </div>
          )}
        </div>
      </Card>

      {/* Raw JSON */}
      <JsonPanel data={tx.raw ?? tx} title="Raw Transaction JSON" />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/transactions" className="text-sm text-slate-400 hover:text-slate-100">
      ← Back to transactions
    </Link>
  );
}

function Detail({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <div className="break-all text-sm font-semibold text-slate-50">{value}</div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

interface TransactionTimelineProps {
  tx: import("@/lib/tx").TxDetail;
}

function TransactionTimeline({ tx }: TransactionTimelineProps) {
  const steps = [
    {
      label: "Submitted",
      time: tx.first_seen_ts || (tx.first_seen_ms ? new Date(tx.first_seen_ms).toISOString() : null),
      completed: true,
      description: "Transaction submitted to mempool",
    },
    {
      label: "Included",
      time: tx.included?.included_ts || (tx.included?.block_hash ? "Yes" : null),
      completed: tx.status === "included" || tx.status === "finalized",
      description: tx.included?.block_hash 
        ? `Block: ${shortenHash(tx.included.block_hash, 6)}`
        : "Waiting for block inclusion",
    },
    {
      label: "Finalized",
      time: tx.finalized?.finalized_ts,
      completed: tx.status === "finalized",
      description: tx.status === "finalized" ? "Transaction confirmed" : "Waiting for finalization",
    },
  ];
  
  // Show rejection instead if rejected
  if (tx.status === "rejected") {
    return (
      <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="font-semibold text-red-200">Transaction Rejected</span>
        </div>
        {tx.rejected_reason && (
          <p className="mt-2 text-sm text-red-200/80">{tx.rejected_reason}</p>
        )}
      </div>
    );
  }
  
  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-800" />
      
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.label} className="relative flex gap-4">
            {/* Circle indicator */}
            <div 
              className={`
                relative z-10 mt-1 h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0
                ${step.completed 
                  ? "border-emerald-500 bg-emerald-500/20" 
                  : "border-slate-700 bg-slate-900"
                }
              `}
            >
              {step.completed && (
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <span className={`font-medium ${step.completed ? "text-slate-100" : "text-slate-500"}`}>
                  {step.label}
                </span>
                {step.time && step.time !== "Yes" && (
                  <span className="text-xs text-slate-500">
                    {typeof step.time === "string" && step.time.includes("T")
                      ? new Date(step.time).toLocaleString()
                      : step.time}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
