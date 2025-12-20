import Link from "next/link";
import SimpleTable from "@/components/tables/SimpleTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchRecentBlocks } from "@/lib/blocks";
import { formatTimestamp, shortenHash } from "@/lib/format";

export default async function BlocksPage() {
  const result = await fetchRecentBlocks();
  
  // Determine the appropriate message based on error type
  const getEmptyMessage = () => {
    if (!result.ok) {
      if ("errorCode" in result && result.errorCode === "endpoint_not_available") {
        return "Block list endpoint not available on this DevNet yet. The node is online but does not expose /blocks.";
      }
      return result.error ?? "IPPAN devnet RPC unavailable.";
    }
    return "No blocks available yet from this DevNet.";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Blocks" description="Latest blocks from devnet /blocks" />
      <Card title="Recent blocks" headerSlot={<SourceBadge source={result.source} />}>
        {!result.ok && (
          <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">
              {result.error ?? "IPPAN devnet RPC unavailable."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              The DevNet node is online (check /status), but the /blocks endpoint may not be implemented yet.
            </p>
          </div>
        )}
        {result.ok && result.blocks.length === 0 ? (
          <p className="text-sm text-slate-400">No blocks available yet from this DevNet.</p>
        ) : result.blocks.length > 0 ? (
          <SimpleTable
            data={result.blocks}
            columns={[
              {
                key: "id",
                header: "Block",
                render: (row) => (
                  <Link href={`/blocks/${row.id}`} className="font-semibold text-emerald-300">
                    #{row.id}
                  </Link>
                )
              },
              { key: "hash", header: "Hash", render: (row) => shortenHash(row.hash) },
              { key: "hashTimer", header: "HashTimer", render: (row) => shortenHash(row.hashTimer, 8) },
              { key: "timestamp", header: "Timestamp", render: (row) => formatTimestamp(row.timestamp) },
              { key: "txCount", header: "Txs" }
            ]}
          />
        ) : null}
      </Card>
    </div>
  );
}
