"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SimpleTable from "@/components/tables/SimpleTable";
import FileSearchForm from "@/components/forms/FileSearchForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchRpc, type FilesResponse, type FileRecord } from "@/lib/clientRpc";

async function fetchFiles(): Promise<{ ok: boolean; files: FileRecord[]; error?: string }> {
  // Use centralized RPC fetch with automatic envelope unwrapping
  const result = await fetchRpc<FilesResponse>("/ipndht/files?limit=100");
  
  if (!result.ok || !result.data) {
    return { ok: false, files: [], error: result.error || "Gateway error" };
  }
  
  // Handle various formats - data is already unwrapped
  const items = result.data.items ?? [];
  return { ok: true, files: items };
}

function shorten(value: string, size = 10) {
  if (!value) return value;
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

export default function FilesClient() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"live" | "error" | "loading">("loading");

  const queryId = (searchParams.get("id") ?? searchParams.get("query") ?? "").trim();
  const queryOwner = (searchParams.get("owner") ?? "").trim();
  const queryTag = (searchParams.get("tag") ?? "").trim();

  useEffect(() => {
    let alive = true;

    async function load() {
      const result = await fetchFiles();
      if (!alive) return;

      if (result.ok) {
        setFiles(result.files);
        setSource("live");
        setError(null);
      } else {
        setFiles([]);
        setSource("error");
        setError(result.error ?? "Failed to load files");
      }
      setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, []);

  // Filter files based on search params
  const filtered = files.filter((file) => {
    if (queryId) {
      const idMatch = 
        file.id.toLowerCase().includes(queryId.toLowerCase()) || 
        file.file_id?.toLowerCase().includes(queryId.toLowerCase());
      if (!idMatch) return false;
    }
    if (queryOwner) {
      if ((file.owner ?? "").toLowerCase() !== queryOwner.toLowerCase()) return false;
    }
    if (queryTag) {
      const tags = (file.tags ?? []).map((tag) => tag.toLowerCase());
      const doctype = typeof file.meta?.doctype === "string" ? file.meta.doctype.toLowerCase() : "";
      const tagMatch = 
        tags.includes(queryTag.toLowerCase()) || 
        doctype === queryTag.toLowerCase() || 
        doctype.includes(queryTag.toLowerCase());
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
        headerSlot={<SourceBadge source={source} />}
      >
        {error && !loading && (
          <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">{error}</p>
            <p className="mt-1 text-xs text-slate-500">
              Try opening <code className="rounded bg-slate-800 px-1">/api/rpc/ipndht/files</code> to verify endpoint status.
            </p>
          </div>
        )}
        <FileSearchForm />
      </Card>

      <Card title="Published files" description={loading ? "Loading..." : `${filtered.length.toLocaleString()} results`}>
        {loading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-8 bg-slate-800 rounded"></div>
            <div className="h-8 bg-slate-800 rounded"></div>
            <div className="h-8 bg-slate-800 rounded"></div>
          </div>
        ) : (
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
        )}
      </Card>
    </div>
  );
}
