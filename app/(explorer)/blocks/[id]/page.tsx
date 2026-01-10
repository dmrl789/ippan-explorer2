import Link from "next/link";
import { JsonPanel } from "@/components/common/JsonPanel";
import { SourceBadge } from "@/components/common/SourceBadge";
import { RpcErrorBanner } from "@/components/common/RpcErrorBanner";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { HashCell } from "@/components/common/HashCell";
import { CopyButton } from "@/components/common/CopyButton";
import { ResponsiveTable } from "@/components/common/ResponsiveTable";
import { fetchBlockDetail } from "@/lib/blocks";
import { shortenHash } from "@/lib/format";
import { formatMs } from "@/lib/ippanTime";
import { IPPAN_RPC_BASE } from "@/lib/rpc";
import { toMs } from "@/lib/clientRpc";

interface BlockDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function BlockDetailPage({ params }: BlockDetailPageProps) {
  const { id } = await params;
  const result = await fetchBlockDetail(id);
  
  // Handle RPC errors
  if (!result.ok) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Block" 
          description={shortenHash(id, 10)} 
          actions={<BackLink />} 
        />
        <Card title="DevNet RPC Error" headerSlot={<SourceBadge source="error" />}>
          <RpcErrorBanner
            error={{
              error: result.error,
              errorCode: "errorCode" in result ? result.errorCode : undefined,
              rpcBase: IPPAN_RPC_BASE,
              path: `/block/${id}`,
            }}
            context="Block Detail"
            showDebugLink={true}
          />
        </Card>
      </div>
    );
  }
  
  // Handle block not found (404 from DevNet)
  if (!result.block) {
    const notFoundReason = "notFoundReason" in result && result.notFoundReason
      ? result.notFoundReason
      : "Block not found on this DevNet.";
    
    return (
      <div className="space-y-6">
        <PageHeader 
          title="Block Not Found" 
          description={shortenHash(id, 10)} 
          actions={<BackLink />} 
        />
        <Card title="Block Not Found" headerSlot={<SourceBadge source="live" />}>
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4">
            <p className="text-sm text-amber-200/80">{notFoundReason}</p>
            <div className="mt-3 text-xs text-slate-500">
              <p className="font-mono break-all">ID: {id}</p>
              <p className="mt-1">This could mean:</p>
              <ul className="mt-1 ml-4 list-disc space-y-0.5">
                <li>The block hash/ID is incorrect</li>
                <li>The block hasn&apos;t been created yet</li>
                <li>The block was on a different fork</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const block = result.block;
  // Convert timestamps (may be in microseconds)
  const rawTs = block.ippan_time_ms ?? block.timestamp;
  const blockIppanMs = toMs(rawTs as unknown as number) ?? Date.now();
  const blockIso = formatMs(blockIppanMs);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Block"
        description={
          <span className="font-mono text-sm break-all">{shortenHash(block.block_hash, 12)}</span>
        }
        actions={<BackLink />}
      />

      {/* Block Header Card */}
      <Card title="Block Header" headerSlot={<SourceBadge source={result.source} />}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Detail 
            label="Block Hash"
            value={
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm break-all">{block.block_hash}</span>
                <CopyButton text={block.block_hash} size="xs" iconOnly />
              </div>
            }
          />
          
          <Detail 
            label="Previous Block"
            value={
              block.prev_block_hash ? (
                <HashCell value={block.prev_block_hash} href={`/blocks/${block.prev_block_hash}`} />
              ) : (
                <span className="text-slate-500">—</span>
              )
            }
          />

          <Detail 
            label="Round ID" 
            value={block.round_id ?? "—"} 
          />

          <Detail 
            label="Transaction Count" 
            value={
              <span className="text-emerald-300 font-semibold">
                {block.tx_count ?? block.tx_ids?.length ?? "—"}
              </span>
            } 
          />

          <Detail label="IPPAN Time (ms)" value={blockIppanMs.toLocaleString()} />
          <Detail label="UTC" value={blockIso} />

          {block.hashtimer && (
            <div className="sm:col-span-2">
              <Detail
                label="HashTimer"
                value={
                  <HashTimerValue
                    id={block.hashtimer}
                    linkClassName="font-mono text-sm text-emerald-300 underline-offset-4 hover:underline"
                  />
                }
              />
            </div>
          )}
        </div>
      </Card>

      {/* Transactions in Block */}
      <Card 
        title="Transactions in Block" 
        description={`${block.tx_ids?.length ?? 0} transactions`}
      >
        {block.tx_ids && block.tx_ids.length > 0 ? (
          <ResponsiveTable
            data={block.tx_ids.map((txId, index) => ({ txId, index }))}
            keyExtractor={(row) => row.txId}
            columns={[
              {
                key: "index",
                header: "#",
                mobilePriority: 2,
                render: (row) => (
                  <span className="text-slate-500 text-xs">{row.index + 1}</span>
                ),
              },
              {
                key: "txId",
                header: "Transaction ID",
                mobilePriority: 1,
                render: (row) => (
                  <Link
                    href={`/tx/${row.txId}`}
                    className="text-emerald-300 hover:text-emerald-200 font-mono text-sm"
                  >
                    {shortenHash(row.txId, 12)}
                  </Link>
                ),
                renderMobile: (row) => (
                  <Link
                    href={`/tx/${row.txId}`}
                    className="text-emerald-300 hover:text-emerald-200 font-mono text-xs"
                  >
                    {shortenHash(row.txId, 8)}
                  </Link>
                ),
              },
            ]}
          />
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-center">
            <p className="text-sm text-slate-400">No transactions in this block</p>
            <p className="mt-1 text-xs text-slate-500">
              This block may contain only consensus data with no user transactions.
            </p>
          </div>
        )}
      </Card>

      {/* Block header details if available */}
      {block.header && Object.keys(block.header).length > 0 && (
        <JsonPanel data={block.header} title="Block Header Details" />
      )}

      {/* Raw Block JSON */}
      <JsonPanel data={block.raw ?? block} title="Raw Block JSON" />
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/blocks" className="text-sm text-slate-400 hover:text-slate-100">
      ← Back to blocks
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500 mb-1">{label}</p>
      <div className="text-sm text-slate-100">{value}</div>
    </div>
  );
}
