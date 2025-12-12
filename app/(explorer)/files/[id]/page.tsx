import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import JsonViewer from "@/components/common/JsonViewer";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchIpndhtFileDescriptor } from "@/lib/files";

interface FilePageProps {
  params: { id: string };
}

function extractUris(retrieval: Record<string, unknown> | undefined): string[] {
  if (!retrieval) return [];
  const candidates: unknown[] = [];
  for (const key of ["uris", "urls", "http", "https", "endpoints"]) {
    const value = (retrieval as Record<string, unknown>)[key];
    if (Array.isArray(value)) candidates.push(...value);
  }
  return candidates.filter((value): value is string => typeof value === "string" && /^https?:\/\//.test(value));
}

export default async function FilePage({ params }: FilePageProps) {
  const { source, file } = await fetchIpndhtFileDescriptor(params.id);
  if (!file) {
    notFound();
  }
  const resolvedFile = file;
  const doctype = typeof resolvedFile.meta?.doctype === "string" ? resolvedFile.meta.doctype : undefined;
  const uris = extractUris(resolvedFile.retrieval);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`File ${resolvedFile.id}`}
        description={doctype ? `Doctype: ${doctype}` : "IPNDHT file descriptor"}
        actions={
          <Link href="/files" className="text-sm text-slate-400 hover:text-slate-100">
            ← Back to files
          </Link>
        }
      />

      <Card
        title="File descriptor"
        description="Metadata only. Clients MUST verify content_hash before using retrieved content."
        headerSlot={<SourceBadge source={source} />}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Detail label="ID" value={resolvedFile.id} />
          <Detail
            label="Owner"
            value={
              resolvedFile.owner ? (
                <Link href={`/accounts/${resolvedFile.owner}`} className="text-emerald-300 underline-offset-4 hover:underline">
                  {resolvedFile.owner}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <Detail label="Content hash" value={resolvedFile.content_hash ?? "—"} />
          <Detail label="Size (bytes)" value={resolvedFile.size_bytes !== undefined ? resolvedFile.size_bytes.toLocaleString() : "—"} />
          <Detail label="Created at" value={resolvedFile.created_at ?? "—"} />
          <Detail label="MIME type" value={resolvedFile.mime_type ?? "—"} />
          <Detail label="Availability" value={resolvedFile.availability ?? "—"} />
          <Detail label="DHT published" value={resolvedFile.dht_published === true ? "Yes" : resolvedFile.dht_published === false ? "No" : "—"} />
          <Detail label="Tags" value={resolvedFile.tags?.length ? resolvedFile.tags.join(", ") : doctype ?? "—"} />
          {doctype && <Detail label="AI doctype" value={doctype} />}
        </div>
      </Card>

      {uris.length > 0 && (
        <Card title="Retrieval hints" description="Client MUST verify content_hash">
          <ul className="space-y-1 text-sm text-slate-200">
            {uris.map((uri) => (
              <li key={uri}>
                <a href={uri} target="_blank" rel="noreferrer" className="text-emerald-300 underline-offset-4 hover:underline">
                  {uri}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-200">
            Warning: URIs are hints only. Always verify the retrieved bytes match <span className="font-mono">content_hash</span>.
          </p>
        </Card>
      )}

      <Card title="Raw file JSON">
        <JsonViewer data={resolvedFile} />
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="break-all text-sm font-semibold text-slate-50">{value}</p>
    </div>
  );
}
