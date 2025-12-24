import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { fetchStatusWithSource } from "@/lib/status";
import { fetchIpndht } from "@/lib/ipndht";
import { L2_APPS, type L2App } from "@/lib/l2Config";

function categoryLabel(category: L2App["category"]) {
  switch (category) {
    case "ai":
      return "AI";
    case "legal":
      return "Legal";
    case "defi":
      return "DeFi";
    default:
      return "Other";
  }
}

function categoryStyles(category: L2App["category"]) {
  switch (category) {
    case "ai":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
    case "legal":
      return "border-sky-500/40 bg-sky-500/10 text-sky-200";
    case "defi":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    default:
      return "border-slate-600/60 bg-slate-900/60 text-slate-200";
  }
}

export default async function L2Page() {
  const [statusRes, ipndht] = await Promise.all([fetchStatusWithSource(), fetchIpndht()]);
  const status = statusRes.ok ? statusRes.status : undefined;
  const statusSource = statusRes.ok ? statusRes.source : "error";

  return (
    <div className="space-y-6">
      <PageHeader
        title="L2 modules"
        description="IPPAN L2 surfaces run on top of L1 HashTimer, accounts, and IPNDHT descriptors (no invented state)."
        actions={
          <Link href="/" className="text-sm text-slate-400 underline-offset-4 hover:text-slate-100 hover:underline">
            ← Back to dashboard
          </Link>
        }
      />

      <Card title="Current L1 context" description="Snapshot from /status" headerSlot={<SourceBadge source={statusSource} />}>
        {status ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label="Node ID" value={status.node_id} />
            <Detail label="Consensus Round" value={`#${status.consensus.round}`} />
            <Detail label="Peer Count" value={status.peer_count.toString()} />
            <Detail label="Network Active" value={status.network_active ? "Yes" : "No"} />
          </div>
        ) : (
          <div className="rounded-lg border border-slate-800/70 bg-slate-900/30 p-3">
            <p className="text-sm text-slate-400">
              {statusRes.ok ? "Status unavailable." : "L1 context unavailable — gateway error"}
            </p>
            {!statusRes.ok && (
              <p className="mt-1 text-xs text-slate-500">
                {"errorCode" in statusRes && statusRes.errorCode === "gateway_unreachable"
                  ? "Unable to reach the canonical RPC gateway."
                  : statusRes.error}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card title="IPNDHT context" description="File descriptors and handles footprint" headerSlot={<SourceBadge source={ipndht.source} />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Files" value={ipndht.summary.files_count.toLocaleString()} />
          <Detail label="Handles" value={ipndht.summary.handles_count.toLocaleString()} />
          <Detail label="Providers" value={ipndht.summary.providers_count === undefined ? "—" : ipndht.summary.providers_count.toLocaleString()} />
          <Detail label="DHT peers" value={ipndht.summary.dht_peers_count === undefined ? "—" : ipndht.summary.dht_peers_count.toLocaleString()} />
        </div>
        {!ipndht.ok && (
          <div className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">
              {"errorCode" in ipndht && ipndht.errorCode === "endpoint_not_available"
                ? "DevNet feature — IPNDHT endpoint not yet exposed"
                : ipndht.error ?? "Gateway RPC unavailable."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {"errorCode" in ipndht && ipndht.errorCode === "endpoint_not_available"
                ? "This is expected during early DevNet phases. L2 modules will have full IPNDHT context once the endpoint is implemented."
                : "Unable to reach the canonical RPC gateway. Check network connectivity."}
            </p>
          </div>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {L2_APPS.map((app) => {
          const tag = app.ipndhtTag?.toLowerCase();
          const matching = tag
            ? ipndht.latest_files.filter((file) => {
                const tags = (file.tags ?? []).map((t) => t.toLowerCase());
                const doctype = typeof file.meta?.doctype === "string" ? file.meta.doctype.toLowerCase() : undefined;
                return tags.includes(tag) || doctype === tag;
              }).length
            : undefined;

          return (
            <Card
              key={app.id}
              title={app.name}
              description={app.description}
              headerSlot={
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${categoryStyles(app.category)}`}>
                  {categoryLabel(app.category)}
                </span>
              }
            >
              <div className="space-y-3">
                {app.ipndhtTag && (
                  <div className="text-sm text-slate-200">
                    IPNDHT tag footprint:{" "}
                    <span className="font-mono">{app.ipndhtTag}</span> ·{" "}
                    <span className="font-semibold">{matching?.toLocaleString() ?? "—"}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {app.docsUrl && (
                    <a
                      href={app.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
                    >
                      Docs
                    </a>
                  )}
                  {app.externalUrl && (
                    <a
                      href={app.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
                    >
                      Open
                    </a>
                  )}
                  {app.ipndhtTag && (
                    <Link
                      href={`/files?tag=${encodeURIComponent(app.ipndhtTag)}`}
                      className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                    >
                      View matching files
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

