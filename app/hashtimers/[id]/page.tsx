import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import CopyButton from "@/components/common/CopyButton";
import JsonViewer from "@/components/common/JsonViewer";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatTimestamp, shortenHash } from "@/lib/format";
import { formatMs, toMsFromUs } from "@/lib/ippanTime";
import type { HashTimerDetail } from "@/types/rpc";
import { LABEL_IPPAN_TIME_MS, LABEL_ROUND, LABEL_FINALIZED_ROUND_INDEX } from "@/lib/terminology";

interface HashTimerPageProps {
  params: { id: string };
}

export default async function HashTimerDetailPage({ params }: HashTimerPageProps) {
  const headerStore = headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${protocol}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const response = await fetch(`${baseUrl}/api/hashtimers/${params.id}`, { cache: "no-store" });
  if (!response.ok) {
    notFound();
  }
  const detail = (await response.json()) as HashTimerDetail;
  const transactions = detail.tx_ids ?? [];
  const parents = detail.parents ?? [];
  const ippanMs =
    detail.ippan_time_ms ??
    (detail.ippan_time_us
      ? toMsFromUs(detail.ippan_time_us)
      : detail.ippan_time
        ? new Date(detail.ippan_time).getTime()
        : undefined);
  const ippanIso =
    ippanMs !== undefined ? formatMs(ippanMs) : detail.ippan_time ? formatTimestamp(detail.ippan_time) : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`HashTimer ${detail.hash_timer_id}`}
        description="Detailed HashTimer anchor with consensus metadata"
        actions={
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-100">
            ← Dashboard
          </Link>
        }
      />

      <Card title="HashTimer overview" headerSlot={<CopyButton text={detail.hash_timer_id} label="Copy HashTimer" />}>
        <div className="space-y-2">
          <HashTimerValue id={detail.hash_timer_id} linkClassName="break-all font-mono text-lg text-emerald-100" />
          {detail.canonical_digest && (
            <p className="text-xs text-slate-400">Digest: {detail.canonical_digest}</p>
          )}
        </div>
        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label={LABEL_IPPAN_TIME_MS} value={ippanMs !== undefined ? ippanMs.toLocaleString() : "—"} />
          <Detail label="UTC" value={ippanIso} />
          <Detail
            label={LABEL_ROUND}
            value={detail.round_height !== undefined ? `#${detail.round_height.toLocaleString()}` : "—"}
          />
          <Detail
            label={LABEL_FINALIZED_ROUND_INDEX}
            value={detail.block_height !== undefined ? `#${detail.block_height.toLocaleString()}` : "—"}
          />
        </div>
      </Card>

      <Card title="Transactions" description={transactions.length ? `${transactions.length} linked txs` : "No transactions tracked"}>
        {transactions.length ? (
          <ul className="space-y-1">
            {transactions.map((hash) => (
              <li key={hash}>
                <Link href={`/tx/${hash}`} className="text-emerald-300 underline-offset-4 hover:underline">
                  {shortenHash(hash)}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-400">No transactions associated with this HashTimer yet.</p>
        )}
      </Card>

      <Card title="Parents">
        {parents.length ? (
          <div className="flex flex-wrap gap-2">
            {parents.map((parent) => (
              <HashTimerValue
                key={parent}
                id={parent}
                linkClassName="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-emerald-200 underline-offset-4 hover:underline"
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No parent HashTimers recorded.</p>
        )}
      </Card>

      <Card title="Raw JSON">
        <details className="rounded-xl border border-slate-800/70 bg-slate-950/50 p-3 text-sm text-slate-200" open>
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-400">View detail</summary>
          <div className="mt-3">
            <JsonViewer data={detail} />
          </div>
        </details>
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
