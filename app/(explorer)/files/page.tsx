import Link from "next/link";
import SimpleTable from "@/components/tables/SimpleTable";
import FileSearchForm from "@/components/forms/FileSearchForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchIpndhtFiles } from "@/lib/files";

interface FilesPageProps {
  searchParams?: { id?: string; owner?: string; tag?: string; query?: string };
}

function shorten(value: string, size = 10) {
  if (!value) return value;
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

export default async function FilesPage({ searchParams }: FilesPageProps) {
  const result = await fetchIpndhtFiles();
  const queryId = (searchParams?.id ?? searchParams?.query ?? "").trim();
  const queryOwner = (searchParams?.owner ?? "").trim();
  const queryTag = (searchParams?.tag ?? "").trim();

  const filtered = result.files.filter((file) => {
    if (queryId) {
      const idMatch = file.id.toLowerCase().includes(queryId.toLowerCase()) || file.file_id?.toLowerCase().includes(queryId.toLowerCase());
      if (!idMatch) return false;
    }
    if (queryOwner) {
      if ((file.owner ?? "").toLowerCase() !== queryOwner.toLowerCase()) return false;
    }
    if (queryTag) {
      const tags = (file.tags ?? []).map((tag) => tag.toLowerCase());
      const doctype = typeof file.meta?.doctype === "string" ? file.meta.doctype.toLowerCase() : "";
      const tagMatch = tags.includes(queryTag.toLowerCase()) || doctype === queryTag.toLowerCase() || doctype.includes(queryTag.toLowerCase());
      if (!tagMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Files" description="Browse IPNDHT file descriptors (metadata only)" />

      <Card
        title="Filter"
        description="Search by file id, owner address, or tag"
        headerSlot={<SourceBadge source={result.source} />}
      >
        {!result.ok && (
          <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">
              {"errorCode" in result && result.errorCode === "endpoint_not_available"
                ? "DevNet feature — Files endpoint not yet exposed"
                : result.error ?? "Gateway RPC unavailable."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {"errorCode" in result && result.errorCode === "endpoint_not_available"
                ? "This is expected during early DevNet phases. The gateway is online — /files will be available once implemented."
                : "Unable to reach the canonical RPC gateway. Check network connectivity."}
            </p>
          </div>
        )}
        <FileSearchForm />
      </Card>

      <Card title="Published files" description={`${filtered.length.toLocaleString()} results`}>
        <SimpleTable
          data={filtered}
          columns={[
            {
              key: "id",
              header: "File",
              render: (row) => (
                <Link href={`/files/${row.id}`} className="text-emerald-300">
                  {shorten(row.id)}
                </Link>
              )
            },
            {
              key: "owner",
              header: "Owner",
              render: (row) =>
                row.owner ? (
                  <Link href={`/accounts/${row.owner}`} className="text-emerald-300 underline-offset-4 hover:underline">
                    {shorten(row.owner)}
                  </Link>
                ) : (
                  "—"
                )
            },
            { key: "mime_type", header: "MIME", render: (row) => row.mime_type ?? "—" },
            { key: "size_bytes", header: "Size", render: (row) => (typeof row.size_bytes === "number" ? `${row.size_bytes.toLocaleString()} B` : "—") },
            { key: "availability", header: "Availability", render: (row) => row.availability ?? "—" },
            { key: "dht_published", header: "DHT", render: (row) => (row.dht_published === true ? "Published" : row.dht_published === false ? "Not published" : "—") },
            { key: "tags", header: "Tags", render: (row) => (row.tags?.length ? row.tags.join(", ") : row.meta?.doctype ? String(row.meta.doctype) : "—") }
          ]}
          emptyMessage="No file descriptors found."
        />
      </Card>
    </div>
  );
}
