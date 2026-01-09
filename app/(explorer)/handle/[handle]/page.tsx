import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { fetchHandleRecord } from "@/lib/handles";

interface HandleDetailPageProps {
  params: Promise<{ handle: string }>;
}

function normalizeHandle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("@")) return trimmed;
  if (trimmed.includes(".ipn") || trimmed.includes(".ai")) return `@${trimmed}`;
  return trimmed;
}

export default async function HandleDetailPage({ params }: HandleDetailPageProps) {
  const { handle: raw } = await params;
  const handle = normalizeHandle(raw);
  const result = await fetchHandleRecord(handle);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Handle"
        description={handle}
        actions={
          <Link href="/handles" className="text-sm text-slate-400 hover:text-slate-100">
            ← Back to handles
          </Link>
        }
      />

      <Card title="Resolution" headerSlot={<SourceBadge source={result.ok ? result.source : "error"} />}>
        {!result.ok ? (
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/30 p-4">
            <p className="text-sm text-slate-300">Devnet RPC unavailable.</p>
            <p className="mt-1 text-xs text-slate-500">{result.error}</p>
          </div>
        ) : result.record ? (
          <div className="space-y-2 text-sm text-slate-300">
            <p>
              Owner:{" "}
              {result.record.owner ? (
                <Link href={`/accounts/${result.record.owner}`} className="text-emerald-300 underline-offset-4 hover:underline">
                  {result.record.owner}
                </Link>
              ) : (
                "—"
              )}
            </p>
            <p>Expires: {result.record.expires_at ?? "—"}</p>
            {result.record.hash_timer_id && (
              <p className="flex items-center gap-2">
                HashTimer:
                <HashTimerValue id={result.record.hash_timer_id} linkClassName="text-emerald-300 underline-offset-4 hover:underline" />
              </p>
            )}
            {result.record.owner && (
              <div className="pt-2">
                <Link
                  href={`/files?owner=${encodeURIComponent(result.record.owner)}`}
                  className="inline-flex rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
                >
                  View files owned by this address
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/30 p-4">
            <p className="text-sm text-slate-300">
              Handle not found (or not implemented on this devnet).
            </p>
            <p className="mt-1 text-xs text-slate-500">
              This page is still valid — the network may simply not be exposing handle resolution yet.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

