"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SimpleTable from "@/components/tables/SimpleTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchProxy } from "@/lib/clientFetch";

interface IpndhtSummaryData {
  files: number;
  handles: number;
  providers?: number;
  dht_peers?: number;
}

interface HandleRecord {
  handle: string;
  owner?: string;
  expires_at?: string;
}

interface FileRecord {
  id: string;
  owner?: string;
  mime_type?: string;
  size_bytes?: number;
  availability?: string;
  tags?: string[];
}

interface HandlesResponse {
  items?: HandleRecord[];
  handles?: HandleRecord[];
}

interface FilesResponse {
  items?: FileRecord[];
  files?: FileRecord[];
}

function formatSize(bytes?: number) {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes < 1024) return `${bytes.toLocaleString()} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function SummaryStat({ label, value, hint }: { label: string; value?: number; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-emerald-100">{value === undefined ? "—" : value.toLocaleString()}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function IpndhtClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<IpndhtSummaryData | null>(null);
  const [handles, setHandles] = useState<HandleRecord[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [sectionsStatus, setSectionsStatus] = useState({
    summary: "loading" as "live" | "error" | "loading",
    handles: "loading" as "live" | "error" | "loading",
    files: "loading" as "live" | "error" | "loading",
  });

  useEffect(() => {
    let alive = true;

    async function loadData() {
      const [summaryRes, handlesRes, filesRes] = await Promise.all([
        fetchProxy<IpndhtSummaryData>("/ipndht/summary"),
        fetchProxy<HandlesResponse>("/ipndht/handles?limit=10"),
        fetchProxy<FilesResponse>("/ipndht/files?limit=10"),
      ]);

      if (!alive) return;

      // Update sections status
      setSectionsStatus({
        summary: summaryRes.ok ? "live" : "error",
        handles: handlesRes.ok ? "live" : "error",
        files: filesRes.ok ? "live" : "error",
      });

      // If summary works, we have a working connection
      if (summaryRes.ok && summaryRes.data) {
        setSummary(summaryRes.data);
        setError(null);
      } else if (!summaryRes.ok && !handlesRes.ok && !filesRes.ok) {
        // All endpoints failed - gateway unreachable
        setError("Gateway RPC unavailable (connection failed)");
        setSummary(null);
      } else {
        // Partial success - show what we have
        setSummary(summaryRes.data ?? null);
        setError(null);
      }

      // Set handles and files
      if (handlesRes.ok && handlesRes.data) {
        const hdata = handlesRes.data;
        setHandles(hdata.items ?? hdata.handles ?? []);
      }
      if (filesRes.ok && filesRes.data) {
        const fdata = filesRes.data;
        setFiles(fdata.items ?? fdata.files ?? []);
      }

      setLoading(false);
    }

    loadData();

    return () => {
      alive = false;
    };
  }, []);

  const source = error ? "error" : loading ? "loading" : "live";

  return (
    <div className="space-y-6">
      <PageHeader
        title="IPNDHT overview"
        description="Explore IPNDHT handles + file descriptors (devnet RPC only)"
        actions={
          <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-100 hover:underline">
            ← Back to dashboard
          </Link>
        }
      />

      <Card
        title="Source"
        description="Data from devnet RPC (via same-origin proxy)"
        headerSlot={<SourceBadge source={source} />}
      >
        {loading && (
          <div className="mb-4 rounded-lg border border-slate-800/50 bg-slate-900/30 p-3">
            <p className="text-sm text-slate-300">Loading IPNDHT data...</p>
          </div>
        )}
        {error && !loading && (
          <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">{error}</p>
            <p className="mt-1 text-xs text-slate-500">
              Try opening <code className="rounded bg-slate-800 px-1">/api/rpc/ipndht/summary</code> to confirm proxy health.
            </p>
          </div>
        )}
        {!loading && (
          <div className="flex flex-wrap gap-2">
            <SourceBadge 
              source={sectionsStatus.summary === "loading" ? "loading" : sectionsStatus.summary} 
              label={`Summary: ${sectionsStatus.summary === "live" ? "devnet" : sectionsStatus.summary}`} 
            />
            <SourceBadge 
              source={sectionsStatus.handles === "loading" ? "loading" : sectionsStatus.handles} 
              label={`Handles: ${sectionsStatus.handles === "live" ? "devnet" : sectionsStatus.handles}`} 
            />
            <SourceBadge 
              source={sectionsStatus.files === "loading" ? "loading" : sectionsStatus.files} 
              label={`Files: ${sectionsStatus.files === "live" ? "devnet" : sectionsStatus.files}`} 
            />
          </div>
        )}
      </Card>

      <Card
        title="Summary stats"
        description="High-level footprint of IPNDHT on L1"
        headerSlot={<SourceBadge source={source} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="Files" value={summary?.files} />
          <SummaryStat label="Handles" value={summary?.handles} />
          <SummaryStat 
            label="Providers" 
            value={summary?.providers} 
            hint={summary?.providers === undefined ? "Not exposed by RPC" : undefined}
          />
          <SummaryStat 
            label="DHT-enabled peers" 
            value={summary?.dht_peers} 
            hint={summary?.dht_peers === undefined ? "Not exposed by RPC" : undefined}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Recent handles"
          description="Resolve @handle.ipn to owners and expiry"
          headerSlot={
            <Link href="/handles" className="text-xs text-emerald-300 underline-offset-4 hover:underline">
              Search handles
            </Link>
          }
        >
          <SimpleTable
            data={handles}
            columns={[
              {
                key: "handle",
                header: "Handle",
                render: (row) => (
                  <Link href={`/handles?query=${encodeURIComponent(row.handle)}`} className="text-emerald-300 underline-offset-4 hover:underline">
                    {row.handle}
                  </Link>
                )
              },
              {
                key: "owner",
                header: "Owner",
                render: (row) =>
                  row.owner ? (
                    <Link href={`/accounts/${row.owner}`} className="text-emerald-300 underline-offset-4 hover:underline">
                      {row.owner}
                    </Link>
                  ) : (
                    "—"
                  )
              },
              { key: "expires_at", header: "Expires", render: (row) => row.expires_at ?? "—" }
            ]}
            emptyMessage="No handle data available."
          />
        </Card>

        <Card
          title="Recent files"
          description="Latest file descriptors (metadata only; clients must verify content hashes)"
          headerSlot={
            <Link href="/files" className="text-xs text-emerald-300 underline-offset-4 hover:underline">
              Browse files
            </Link>
          }
        >
          <SimpleTable
            data={files}
            columns={[
              {
                key: "id",
                header: "File ID",
                render: (row) => (
                  <Link href={`/files/${row.id}`} className="text-emerald-300 underline-offset-4 hover:underline">
                    {row.id}
                  </Link>
                )
              },
              {
                key: "owner",
                header: "Owner",
                render: (row) =>
                  row.owner ? (
                    <Link href={`/accounts/${row.owner}`} className="text-emerald-300 underline-offset-4 hover:underline">
                      {row.owner}
                    </Link>
                  ) : (
                    "—"
                  )
              },
              { key: "mime_type", header: "MIME", render: (row) => row.mime_type ?? "—" },
              { key: "size_bytes", header: "Size", render: (row) => formatSize(row.size_bytes) },
              { key: "availability", header: "Availability", render: (row) => row.availability ?? "—" },
              { key: "tags", header: "Tags", render: (row) => (row.tags?.length ? row.tags.join(", ") : "—") }
            ]}
            emptyMessage="No file data available."
          />
        </Card>
      </div>

      <Card
        title="Providers"
        description="Provider announcements (if exposed by RPC)"
        headerSlot={<Link href="/network" className="text-xs text-emerald-300 underline-offset-4 hover:underline">View network</Link>}
      >
        <SimpleTable
          data={[]}
          columns={[
            { key: "peer_id", header: "Peer", render: (row: { peer_id: string }) => <span className="break-all font-mono text-xs sm:text-sm">{row.peer_id}</span> },
            { key: "provides", header: "Provides" }
          ]}
          emptyMessage="Provider announcements are not available yet."
        />
      </Card>
    </div>
  );
}
