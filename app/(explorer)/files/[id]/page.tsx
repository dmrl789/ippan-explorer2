import Link from "next/link";
import { notFound } from "next/navigation";
import JsonViewer from "@/components/common/JsonViewer";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFileRecord } from "@/lib/mockData";

interface FilePageProps {
  params: { id: string };
}

export default async function FilePage({ params }: FilePageProps) {
  const file = await getFileRecord(params.id);
  if (!file) {
    notFound();
  }
  const resolvedFile = file;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`File ${resolvedFile.id}`}
        description={`Mode ${resolvedFile.mode}`}
        actions={
          <Link href="/files" className="text-sm text-slate-400 hover:text-slate-100">
            ← Back to files
          </Link>
        }
      />
      <Card title="File descriptor">
        <div className="grid gap-4 md:grid-cols-2">
          <Detail label="Owner" value={resolvedFile.owner} />
          <Detail label="Size" value={`${(resolvedFile.size / (1024 * 1024)).toFixed(2)} MB`} />
          <Detail label="Mode" value={resolvedFile.mode} />
          {resolvedFile.mimeType && <Detail label="MIME type" value={resolvedFile.mimeType} />}
          {resolvedFile.description && <Detail label="Description" value={resolvedFile.description} />}
        </div>
      </Card>
      <Card title="Raw file JSON">
        <JsonViewer data={resolvedFile} />
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="break-all text-sm font-semibold text-slate-50">{value}</p>
    </div>
  );
}
