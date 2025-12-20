import Link from "next/link";
import SimpleTable from "@/components/tables/SimpleTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchIpndht } from "@/lib/ipndht";

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

export default async function IpndhtPage() {
  const data = await fetchIpndht();

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
        description="Data from devnet RPC"
        headerSlot={<SourceBadge source={data.source} />}
      >
        {!data.ok && (
          <div className="mb-4 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">
              {"errorCode" in data && data.errorCode === "endpoint_not_available"
                ? "IPNDHT endpoint not implemented yet on this DevNet (404 expected)."
                : data.error ?? "IPPAN devnet RPC unavailable."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              The DevNet node is online (check /status), but the /ipndht endpoint may not be implemented yet.
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <SourceBadge source={data.sections?.handles ?? data.source} label={`Handles: ${data.sections?.handles === "live" ? "devnet" : "error"}`} />
          <SourceBadge source={data.sections?.files ?? data.source} label={`Files: ${data.sections?.files === "live" ? "devnet" : "error"}`} />
          <SourceBadge
            source={data.sections?.providers ?? data.source}
            label={`Providers: ${data.sections?.providers === "live" ? "devnet" : "error"}`}
          />
          <SourceBadge source={data.sections?.peers ?? data.source} label={`Peers: ${data.sections?.peers === "live" ? "devnet" : "error"}`} />
        </div>
      </Card>

      <Card
        title="Summary stats"
        description="High-level footprint of IPNDHT on L1"
        headerSlot={<SourceBadge source={data.source} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="Files" value={data.summary.files_count} />
          <SummaryStat label="Handles" value={data.summary.handles_count} />
          <SummaryStat
            label="Providers"
            value={data.summary.providers_count}
            hint={data.summary.providers_count === undefined ? "Not exposed by RPC" : undefined}
          />
          <SummaryStat
            label="DHT-enabled peers"
            value={data.summary.dht_peers_count}
            hint={data.summary.dht_peers_count === undefined ? "Not exposed by RPC" : undefined}
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
            data={data.latest_handles}
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
            data={data.latest_files}
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
          data={data.providers}
          columns={[
            { key: "peer_id", header: "Peer", render: (row) => <span className="break-all font-mono text-xs sm:text-sm">{row.peer_id}</span> },
            { key: "provides", header: "Provides" }
          ]}
          emptyMessage="Provider announcements are not available yet."
        />
      </Card>
    </div>
  );
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
