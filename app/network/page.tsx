import Link from "next/link";
import SimpleTable from "@/components/tables/SimpleTable";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchPeers } from "@/lib/peers";

function formatLastSeen(ms?: number) {
  if (ms === undefined || ms === null) return "—";
  if (ms < 1000) return `${ms} ms ago`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export default async function NetworkPage() {
  const peerData = await fetchPeers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Network peers"
        description="IPNDHT-facing peer set from /peers with mock fallback"
        actions={
          <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-100 hover:underline">
            ← Back to dashboard
          </Link>
        }
      />

      <Card
        title="Peers"
        description="Libp2p peer announcements with agent and address context"
        headerSlot={
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
              peerData.source === "rpc"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            Source: {peerData.source === "rpc" ? "RPC" : "Mock"}
          </span>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-3xl font-semibold text-emerald-100">{peerData.peers.length}</p>
            <p className="text-xs uppercase tracking-wide text-slate-500">Peers discovered</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/handles"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
            >
              Visit handles
            </Link>
            <Link
              href="/files"
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
            >
              Visit files
            </Link>
          </div>
        </div>

        <SimpleTable
          data={peerData.peers}
          columns={[
            {
              key: "peer_id",
              header: "Peer ID",
              render: (row) => <span className="break-all font-mono text-xs sm:text-sm">{row.peer_id}</span>
            },
            { key: "addr", header: "Address", render: (row) => row.addr ?? "—" },
            { key: "agent", header: "Agent", render: (row) => row.agent ?? "—" },
            { key: "last_seen_ms", header: "Last seen", render: (row) => formatLastSeen(row.last_seen_ms) }
          ]}
        />
      </Card>
    </div>
  );
}
