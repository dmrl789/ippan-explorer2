import Link from "next/link";
import { JsonPanel } from "@/components/common/JsonPanel";
import { SourceBadge } from "@/components/common/SourceBadge";
import { RpcErrorBanner } from "@/components/common/RpcErrorBanner";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { HashCell } from "@/components/common/HashCell";
import { fetchRoundDetail } from "@/lib/round";
import { shortenHash } from "@/lib/format";
import { IPPAN_RPC_BASE } from "@/lib/rpc";

interface RoundPageProps {
  params: Promise<{ id: string }>;
}

export default async function RoundPage({ params }: RoundPageProps) {
  const { id } = await params;
  const result = await fetchRoundDetail(id);

  if (!result.ok) {
    return (
      <div className="space-y-6">
        <PageHeader title="Round" description={`#${id}`} actions={<BackLink />} />
        <Card title="DevNet RPC Error" headerSlot={<SourceBadge source="error" />}>
          <RpcErrorBanner
            error={{
              error: result.error,
              errorCode: "errorCode" in result ? result.errorCode : undefined,
              rpcBase: IPPAN_RPC_BASE,
              path: `/round/${id}`,
            }}
            context="Round Detail"
            showDebugLink={true}
          />
        </Card>
      </div>
    );
  }

  if (!result.round) {
    return (
      <div className="space-y-6">
        <PageHeader title="Round Not Found" description={`#${id}`} actions={<BackLink />} />
        <Card title="Round Not Found" headerSlot={<SourceBadge source="live" />}>
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4">
            <p className="text-sm text-amber-200/80">
              Round #{id} was not found on this DevNet.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              This could mean the round hasn&apos;t been produced yet, or the node returned 404.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const round = result.round;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Round"
        description={<span className="font-mono text-sm">#{String(round.round_id)}</span>}
        actions={<BackLink />}
      />

      <Card title="Round Header" headerSlot={<SourceBadge source={result.source} />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail label="Round ID" value={<span className="font-mono">{String(round.round_id)}</span>} />
          <Detail
            label="Round Hash"
            value={round.round_hash ? <HashCell value={round.round_hash} /> : <span className="text-slate-500">—</span>}
          />
          <Detail
            label="Previous Round"
            value={
              round.prev_round_hash ? <HashCell value={round.prev_round_hash} /> : <span className="text-slate-500">—</span>
            }
          />
          <Detail
            label="Round HashTimer"
            value={round.round_hashtimer ? <HashCell value={round.round_hashtimer} /> : <span className="text-slate-500">—</span>}
          />
          <Detail label="Blocks" value={round.block_count ?? round.included_blocks?.length ?? "—"} />
          <Detail label="Ordered Txs" value={round.tx_count ?? round.ordered_tx_ids?.length ?? "—"} />
        </div>
      </Card>

      <Card title="Included Blocks" description={`${round.included_blocks?.length ?? 0} blocks`}>
        {round.included_blocks && round.included_blocks.length > 0 ? (
          <div className="space-y-2">
            {round.included_blocks.slice(0, 200).map((bh) => (
              <div key={bh}>
                <Link href={`/blocks/${bh}`} className="font-mono text-sm text-emerald-300 hover:underline">
                  {shortenHash(bh, 12)}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No included blocks listed for this round.</p>
        )}
      </Card>

      <Card title="Ordered Transaction IDs" description={`${round.ordered_tx_ids?.length ?? 0} txs`}>
        {round.ordered_tx_ids && round.ordered_tx_ids.length > 0 ? (
          <div className="space-y-2">
            {round.ordered_tx_ids.slice(0, 200).map((tx) => (
              <div key={tx}>
                <Link href={`/tx/${tx}`} className="font-mono text-sm text-emerald-300 hover:underline">
                  {shortenHash(tx, 12)}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No ordered tx list available for this round.</p>
        )}
      </Card>

      <JsonPanel data={round.raw ?? round} title="Raw Round JSON" />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/blocks" className="text-sm text-slate-400 hover:text-slate-100">
      ← Back
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500 mb-1">{label}</p>
      <div className="text-sm text-slate-100 break-all">{value}</div>
    </div>
  );
}

