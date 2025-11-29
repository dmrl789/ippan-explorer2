import Link from "next/link";
import SimpleTable from "@/components/tables/SimpleTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFiles } from "@/lib/mockData";

export default async function FilesPage() {
  const files = await getFiles();
  return (
    <div className="space-y-6">
      <PageHeader title="Files" description="Inspect IPNDHT publications and artifacts" />
      <Card title="Published files">
        <SimpleTable
          data={files}
          columns={[
            {
              key: "id",
              header: "File",
              render: (row) => (
                <Link href={`/files/${row.id}`} className="text-emerald-300">
                  {row.id}
                </Link>
              )
            },
            { key: "owner", header: "Owner" },
            { key: "size", header: "Size", render: (row) => `${(row.size / (1024 * 1024)).toFixed(2)} MB` },
            { key: "mode", header: "Mode" }
          ]}
        />
      </Card>
    </div>
  );
}
