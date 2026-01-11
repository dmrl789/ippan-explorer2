"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import SimpleTable from "@/components/tables/SimpleTable";
import FileSearchForm from "@/components/forms/FileSearchForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchProxy } from "@/lib/clientFetch";
import type { FilesSSRData } from "@/app/(explorer)/files/page";

interface FileRecord {
  id: string;
  file_id?: string;
  owner?: string;
  mime_type?: string;
  size_bytes?: number;
  availability?: string;
  dht_published?: boolean;
  tags?: string[];
  meta?: { doctype?: string };
}

interface FilesResponse {
  items?: FileRecord[];
  files?: FileRecord[];
  total?: number;
}

async function fetchFiles(): Promise<{ ok: boolean; files: FileRecord[]; error?: string }> {
  const result = await fetchProxy<FilesResponse>("/ipndht/files?limit=100");

  if (!result.ok || !result.data) {
    return { ok: false, files: [], error: !result.ok ? result.error : "Gateway error" };
  }

  // Handle various response shapes
  const items = result.data.items ?? result.data.files ?? [];
  return { ok: true, files: items };
}

function shorten(value: string, size = 10) {
  if (!value) return value;
  if (value.length <= size * 2) return value;
  return `${value.slice(0, size)}…${value.slice(-size)}`;
}

interface FilesClientProps {
  initial?: FilesSSRData;
}

export default function FilesClient({ initial }: FilesClientProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(!initial?.ok);
  const [files, setFiles] = useState<FileRecord[]>(initial?.files ?? []);
  const [error, setError] = useState<string | null>(initial?.error ?? null);
  const [source, setSource] = useState<"live" | "error" | "loading">(
    initial?.ok ? "live" : initial?.error ? "error" : "loading"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryId = (searchParams.get("id") ?? searchParams.get("query") ?? "").trim();
  const queryOwner = (searchParams.get("owner") ?? "").trim();
  const queryTag = (searchParams.get("tag") ?? "").trim();

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    const result = await fetchFiles();

    if (result.ok) {
      setFiles(result.files);
      setSource("live");
      setError(null);
    } else {
      // Don't wipe existing data on refresh error
      if (files.length === 0) {
        setSource("error");
      }
      setError(result.error ?? "Failed to load files");
    }
    setLoading(false);
    setIsRefreshing(false);
  }, [files.length]);

  useEffect(() => {
    // Refresh to validate/update SSR data
    refresh();
  }, [refresh]);

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
        headerSlot={
          <div className="flex items-center gap-3">
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100 disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <SourceBadge source={source} />
          </div>
        }
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
