import Link from "next/link";
import SimpleTable from "@/components/tables/SimpleTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchRecentBlocks } from "@/lib/blocks";
import { formatTimestamp, shortenHash } from "@/lib/format";

export default async function BlocksPage() {
  const { source, blocks } = await fetchRecentBlocks();
  return (
    <div className="space-y-6">
      <PageHeader title="Blocks" description="Latest blocks from /blocks (mock fallback is always badged)" />
      <Card title="Recent blocks" headerSlot={<SourceBadge source={source} />}>
        <SimpleTable
          data={blocks}
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
