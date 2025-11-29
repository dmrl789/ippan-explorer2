import Link from "next/link";
import SimpleTable from "@/components/tables/SimpleTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getRecentBlocks } from "@/lib/mockData";
import { formatTimestamp, shortenHash } from "@/lib/format";

export default async function BlocksPage() {
  const blocks = await getRecentBlocks();
  return (
    <div className="space-y-6">
      <PageHeader title="Blocks" description="Recent finalized blocks and their transactions" />
      <Card title="Recent blocks">
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
            { key: "timestamp", header: "Timestamp", render: (row) => formatTimestamp(row.timestamp) },
            { key: "txCount", header: "Txs" }
          ]}
        />
      </Card>
    </div>
  );
}
