import Link from "next/link";
import SimpleTable from "@/components/tables/SimpleTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchRecentBlocks } from "@/lib/blocks";
import { formatTimestamp, shortenHash } from "@/lib/format";

export default async function BlocksPage() {
  const result = await fetchRecentBlocks();
  return (
    <div className="space-y-6">
      <PageHeader title="Blocks" description="Latest blocks from devnet /blocks" />
      <Card title="Recent blocks" headerSlot={<SourceBadge source={result.source} />}>
        {!result.ok && <p className="mb-3 text-sm text-slate-400">{result.error ?? "IPPAN devnet RPC unavailable."}</p>}
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
      </Card>
    </div>
  );
}
