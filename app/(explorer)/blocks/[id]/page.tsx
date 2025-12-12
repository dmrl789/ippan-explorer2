import Link from "next/link";
import { notFound } from "next/navigation";
import SimpleTable from "@/components/tables/SimpleTable";
import JsonViewer from "@/components/common/JsonViewer";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { fetchBlockDetail } from "@/lib/blocks";
import { formatAmount, shortenHash } from "@/lib/format";
import { formatMs, toMsFromUs } from "@/lib/ippanTime";

interface BlockDetailPageProps {
  params: { id: string };
}

export default async function BlockDetailPage({ params }: BlockDetailPageProps) {
  const { source, block } = await fetchBlockDetail(params.id);
  if (!block) {
    notFound();
  }
  const resolvedBlock = block;
  const blockIppanMs =
    resolvedBlock.ippan_time_ms ??
    (resolvedBlock.ippan_time_us
      ? toMsFromUs(resolvedBlock.ippan_time_us)
      : new Date(resolvedBlock.timestamp).getTime());
  const blockIso = formatMs(blockIppanMs);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Block #${resolvedBlock.id}`}
        description={`Hash ${shortenHash(resolvedBlock.hash)}`}
        actions={
          <Link href="/blocks" className="text-sm text-slate-400 hover:text-slate-100">
            ← Back to blocks
          </Link>
        }
      />

      <Card title="Block header" headerSlot={<SourceBadge source={source} />}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div>
              <p className="text-xs uppercase text-slate-500">IPPAN Time (ms)</p>
              <p className="text-lg font-semibold text-slate-50">{blockIppanMs.toLocaleString()}</p>
              <p className="text-xs text-slate-400">UTC {blockIso}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">HashTimer</p>
              <HashTimerValue
                id={resolvedBlock.hashTimer}
                linkClassName="font-mono text-sm text-emerald-300 underline-offset-4 hover:underline"
              />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Parents</p>
            <div className="text-sm text-slate-200">
              {resolvedBlock.parents.map((parent) => (
                <div key={parent}>{parent}</div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Transactions" description={`${resolvedBlock.transactions.length} transactions`}>
        <SimpleTable
          data={resolvedBlock.transactions}
          columns={[
            {
              key: "hash",
              header: "Tx",
              render: (row) => (
                <Link href={`/tx/${row.hash}`} className="text-emerald-300">
                  {shortenHash(row.hash)}
                </Link>
              )
            },
            { key: "from", header: "From", render: (row) => shortenHash(row.from) },
            { key: "to", header: "To", render: (row) => shortenHash(row.to) },
            { key: "amount", header: "Amount", render: (row) => formatAmount(row.amount) },
            { key: "fee", header: "Fee", render: (row) => `${row.fee} IPN` }
          ]}
        />
      </Card>

      <Card title="Raw block JSON">
        <JsonViewer data={resolvedBlock} />
      </Card>
    </div>
  );
}
