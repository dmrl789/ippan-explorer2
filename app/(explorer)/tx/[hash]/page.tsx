import Link from "next/link";
import type { ReactNode } from "react";
import JsonViewer from "@/components/common/JsonViewer";
import { SourceBadge } from "@/components/common/SourceBadge";
import { RpcErrorBanner } from "@/components/common/RpcErrorBanner";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { fetchTransactionDetail } from "@/lib/tx";
import { formatAmount, shortenHash } from "@/lib/format";
import { formatMs, toMsFromUs } from "@/lib/ippanTime";
import { IPPAN_RPC_BASE } from "@/lib/rpc";

interface TransactionPageProps {
  params: { hash: string };
}

export default async function TransactionDetailPage({ params }: TransactionPageProps) {
  const result = await fetchTransactionDetail(params.hash);
  
  // Handle RPC errors
  if (!result.ok) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Transaction" 
          description={shortenHash(params.hash)} 
          actions={<Link href="/blocks" className="text-sm text-slate-400 hover:text-slate-100">← Back</Link>} 
        />
        <Card title="DevNet RPC Error" headerSlot={<SourceBadge source="error" />}>
          <RpcErrorBanner
            error={{
              error: result.error,
              errorCode: "errorCode" in result ? result.errorCode : undefined,
              rpcBase: IPPAN_RPC_BASE,
              path: `/tx/${params.hash}`,
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
          description={shortenHash(params.hash)} 
          actions={<Link href="/blocks" className="text-sm text-slate-400 hover:text-slate-100">← Back</Link>} 
        />
        <Card title="Transaction Not Found" headerSlot={<SourceBadge source="live" />}>
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4">
            <p className="text-sm text-amber-200/80">{notFoundReason}</p>
            <div className="mt-3 text-xs text-slate-500">
              <p className="font-mono break-all">Hash: {params.hash}</p>
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
  
  const resolvedTx = result.tx;
  const txIppanMs =
    resolvedTx.ippan_time_ms ??
    (resolvedTx.ippan_time_us
      ? toMsFromUs(resolvedTx.ippan_time_us)
      : new Date(resolvedTx.timestamp).getTime());
  const txIso = formatMs(txIppanMs);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Transaction ${shortenHash(resolvedTx.hash)}`}
        description={`Type: ${resolvedTx.type}`}
        actions={
          <Link href="/blocks" className="text-sm text-slate-400 hover:text-slate-100">
            ← Back
          </Link>
        }
      />

      <Card title="Transaction summary" headerSlot={<SourceBadge source={result.source} />}>
        <div className="grid gap-4 md:grid-cols-2">
          <Detail label="From" value={resolvedTx.from} />
          <Detail label="To" value={resolvedTx.to} />
          <Detail label="Amount" value={formatAmount(resolvedTx.amount)} hint={`${resolvedTx.amountAtomic} atomic`} />
          <Detail label="Fee" value={`${resolvedTx.fee} IPN`} />
          <Detail label="IPPAN Time (ms)" value={txIppanMs.toLocaleString()} />
          <Detail label="UTC" value={txIso} />
          <Detail
            label="HashTimer"
            value={
              <HashTimerValue
                id={resolvedTx.hashTimer}
                linkClassName="text-emerald-300 underline-offset-4 hover:underline"
              />
            }
          />
          {resolvedTx.blockId && (
            <Detail
              label="Included in block"
              value={
                <Link href={`/blocks/${resolvedTx.blockId}`} className="text-emerald-300">
                  #{resolvedTx.blockId}
                </Link>
              }
            />
          )}
        </div>
      </Card>

      <Card title="Raw transaction JSON">
        <JsonViewer data={resolvedTx} />
      </Card>
    </div>
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
