import Link from "next/link";
import SimpleTable from "@/components/tables/SimpleTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { fetchIpndht } from "@/lib/ipndht";

function formatSize(bytes?: number) {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export default async function IpndhtPage() {
  const data = await fetchIpndht();

  return (
    <div className="space-y-6">
      <PageHeader
        title="IPNDHT overview"
        description="Handles, files, and provider announcements with mock fallback"
        actions={
          <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-100 hover:underline">
            ← Back to dashboard
          </Link>
        }
      />

      <Card
        title="Registry summary"
        description="Aggregated counts sourced from RPC where available"
        headerSlot={<SourceBadge source={data.source} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="Handles" value={data.summary.handles} />
          <SummaryStat label="Files" value={data.summary.files} />
          <SummaryStat label="Providers" value={data.summary.providers} />
          <SummaryStat label="Peers" value={data.summary.peers} />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Latest handles"
          description="Recent handle publications with optional HashTimer anchors"
          headerSlot={<Link href="/handles" className="text-xs text-emerald-300 underline-offset-4 hover:underline">View handles</Link>}
        >
          <SimpleTable
            data={data.latest_handles}
            columns={[
              { key: "handle", header: "Handle" },
              { key: "owner", header: "Owner", render: (row) => row.owner ?? "—" },
              {
                key: "hash_timer_id",
                header: "HashTimer",
                render: (row) => (row.hash_timer_id ? <HashTimerValue id={row.hash_timer_id} short /> : "—")
              }
            ]}
          />
        </Card>

        <Card
          title="Latest files"
          description="Recent files registered against the IPNDHT layer"
          headerSlot={<Link href="/files" className="text-xs text-emerald-300 underline-offset-4 hover:underline">View files</Link>}
        >
          <SimpleTable
            data={data.latest_files}
            columns={[
              { key: "file_id", header: "File" },
              { key: "size_bytes", header: "Size", render: (row) => formatSize(row.size_bytes) },
              {
                key: "hash_timer_id",
                header: "HashTimer",
                render: (row) => (row.hash_timer_id ? <HashTimerValue id={row.hash_timer_id} short /> : "—")
              }
            ]}
          />
        </Card>
      </div>

      <Card
        title="Providers"
        description="Peers advertising handle or file availability"
        headerSlot={<Link href="/network" className="text-xs text-emerald-300 underline-offset-4 hover:underline">View network</Link>}
      >
        <SimpleTable
          data={data.providers}
          columns={[
            { key: "peer_id", header: "Peer", render: (row) => <span className="break-all font-mono text-xs sm:text-sm">{row.peer_id}</span> },
            { key: "provides", header: "Provides" }
          ]}
        />
      </Card>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-2xl font-semibold text-emerald-100">{value.toLocaleString()}</p>
    </div>
  );
}
