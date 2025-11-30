import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import JsonViewer from "@/components/common/JsonViewer";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { getTransaction } from "@/lib/mockData";
import { formatAmount, shortenHash } from "@/lib/format";
import { formatMs, toMsFromUs } from "@/lib/ippanTime";

interface TransactionPageProps {
  params: { hash: string };
}

export default async function TransactionDetailPage({ params }: TransactionPageProps) {
  const transaction = await getTransaction(params.hash);
  if (!transaction) {
    notFound();
  }
  const resolvedTx = transaction;
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

      <Card title="Transaction summary">
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
