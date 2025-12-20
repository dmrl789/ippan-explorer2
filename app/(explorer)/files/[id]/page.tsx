import Link from "next/link";
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
  const result = await fetchIpndhtFileDescriptor(params.id);
  
  // Handle RPC errors
  if (!result.ok) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="File" 
          description={params.id} 
          actions={<Link href="/files" className="text-sm text-slate-400 hover:text-slate-100">← Back to files</Link>} 
        />
        <Card title="DevNet RPC Error" headerSlot={<SourceBadge source="error" />}>
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 p-4">
            <p className="text-sm text-red-200/80">{result.error}</p>
            <p className="mt-2 text-xs text-slate-500">
              The DevNet node may be temporarily unavailable or the /files endpoint is not implemented yet.
            </p>
          </div>
        </Card>
      </div>
    );
  }
  
  // Handle file not found (404 from DevNet)
  if (!result.file) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="File Not Found" 
          description={params.id} 
          actions={<Link href="/files" className="text-sm text-slate-400 hover:text-slate-100">← Back to files</Link>} 
        />
        <Card title="File Not Found" headerSlot={<SourceBadge source="live" />}>
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4">
            <p className="text-sm text-amber-200/80">
              File descriptor not found on this DevNet.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              The file ID may be incorrect, or the file has not been registered with IPNDHT on this DevNet.
            </p>
          </div>
        </Card>
      </div>
    );
  }
  const resolvedFile = result.file;
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
        headerSlot={<SourceBadge source={result.source} />}
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
