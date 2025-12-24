import Link from "next/link";
import HandleSearchForm from "@/components/forms/HandleSearchForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchHandleRecord } from "@/lib/handles";

interface HandlesPageProps {
  searchParams: { handle?: string; query?: string };
}

export default async function HandlesPage({ searchParams }: HandlesPageProps) {
  const handleQuery = searchParams.handle ?? searchParams.query;
  const result = handleQuery ? await fetchHandleRecord(handleQuery) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Handles" description="Resolve @handle.ipn registrations to their owning address" />

      <Card title="Lookup">
        <HandleSearchForm />
      </Card>

      {handleQuery && (
        <Card title={`Lookup result for ${handleQuery}`} headerSlot={<SourceBadge source={result?.ok ? result.source : "error"} />}>
          {!result?.ok ? (
            <p className="text-sm text-slate-400">{result?.error ?? "Gateway RPC unavailable."}</p>
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
            <p className="text-sm text-slate-400">Handle not found.</p>
          )}
        </Card>
      )}
    </div>
  );
}
