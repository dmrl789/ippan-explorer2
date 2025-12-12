import Link from "next/link";
import type { Route } from "next";
import { Suspense, type ReactNode } from "react";
import { DashboardGraphs } from "@/components/DashboardGraphs";
import CopyButton from "@/components/common/CopyButton";
import StatusDataTabs from "@/components/common/StatusDataTabs";
import { HashTimerValue } from "@/components/common/HashTimerValue";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { formatMs } from "@/lib/ippanTime";
import { fetchStatusWithSource } from "@/lib/status";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { fetchPeers } from "@/lib/peers";
import { fetchIpndht } from "@/lib/ipndht";
import {
  LABEL_FINALIZED_ROUND_INDEX,
  LABEL_IPPAN_TIME,
  LABEL_LATEST_FINALIZED_HASHTIMER,
  LABEL_LATEST_OBSERVED_HASHTIMER_LOCAL,
  TIP_FINALIZED_ROUND_INDEX,
  TIP_IPPAN_TIME,
  TIP_LATEST_FINALIZED_HASHTIMER,
  TIP_LATEST_OBSERVED_HASHTIMER_LOCAL
} from "@/lib/terminology";

export default async function DashboardPage() {
  const [{ status, source: statusSource }, peers, ipndht] = await Promise.all([
    fetchStatusWithSource(),
    fetchPeers(),
    fetchIpndht()
  ]);
  const rpcBase = getRpcBaseUrl();
  const observedRoundId = status.head.round_id ?? status.head.round_height;
  const validatorsOnline = status.live.validators_online ?? status.live.active_operators;
  const latestFinalizedRound = status.latest_rounds?.find((round) => round.finalized);
  const latestFinalizedHashTimer = latestFinalizedRound?.end_hash_timer_id;
  const finalizedRoundIndex = status.counters?.finalized_rounds ?? latestFinalizedRound?.round_height;

  const orderingAnchorHashTimer = latestFinalizedHashTimer ?? status.head.hash_timer_id;
  const orderingAnchorLabel = latestFinalizedHashTimer
    ? LABEL_LATEST_FINALIZED_HASHTIMER
    : LABEL_LATEST_OBSERVED_HASHTIMER_LOCAL;
  const orderingAnchorTip = latestFinalizedHashTimer ? TIP_LATEST_FINALIZED_HASHTIMER : TIP_LATEST_OBSERVED_HASHTIMER_LOCAL;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Truthful L1 snapshot + IPNDHT + L2 launchpad (mock fallback is always badged)"
        actions={
          <a
            href={rpcBase ? `${rpcBase}/status` : "/api/status"}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
          >
            View /status JSON
          </a>
        }
      />

      <Card
        title={orderingAnchorLabel}
        description="Ordering anchor derived from rounds and HashTimers"
        headerSlot={<CopyButton text={orderingAnchorHashTimer} label="Copy HashTimer" />}
      >
        <div className="flex flex-wrap items-center gap-3 text-base">
          <HashTimerValue
            id={orderingAnchorHashTimer}
            linkClassName="font-mono text-lg text-emerald-100 underline-offset-4 hover:underline"
          />
          <StatusPill status={status.head.finalized ? "ok" : "warn"} />
          <SourceBadge source={statusSource} label={statusSource === "rpc" ? "Live" : "Mock"} />
          {status.head.hash_timer_seq && (
            <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-300">Seq {status.head.hash_timer_seq}</span>
          )}
        </div>
        <p className="mt-2 text-sm text-slate-400">{orderingAnchorTip}</p>
        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem
            label={LABEL_IPPAN_TIME}
            value={status.head.ippan_time_ms.toLocaleString()}
            secondary={`UTC ${formatMs(status.head.ippan_time_ms)}`}
            tooltip={TIP_IPPAN_TIME}
          />
          <DetailItem
            label={LABEL_FINALIZED_ROUND_INDEX}
            value={finalizedRoundIndex !== undefined ? `#${finalizedRoundIndex.toLocaleString()}` : "—"}
            tooltip={TIP_FINALIZED_ROUND_INDEX}
          />
          <DetailItem
            label={LABEL_LATEST_FINALIZED_HASHTIMER}
            value={
              latestFinalizedHashTimer ? (
                <HashTimerValue
                  id={latestFinalizedHashTimer}
                  linkClassName="font-mono text-sm text-emerald-100 underline-offset-4 hover:underline"
                />
              ) : (
                "—"
              )
            }
            tooltip={TIP_LATEST_FINALIZED_HASHTIMER}
          />
          <DetailItem label="Finalized" value={status.head.finalized ? "Finalized" : "Pending"} />
        </div>
      </Card>

      <Card title="Explore" description="Entry points for L1, IPNDHT, and L2 surfaces">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <FeatureCard
            title="DAG blocks"
            href={"/blocks" as Route}
            source={statusSource}
            subtitle="DAG blocks + transactions"
            value={`DAG block #${status.head.block_height.toLocaleString()}`}
          />
          <FeatureCard
            title="Accounts & payments"
            href={"/accounts" as Route}
            source={statusSource}
            subtitle="Lookup by address"
            value="Try: 0x…"
          />
          <FeatureCard
            title="IPNDHT"
            href={"/ipndht" as Route}
            source={ipndht.source}
            subtitle="Handles + Files + Providers"
            value={`${ipndht.summary.handles_count} handles · ${ipndht.summary.files_count} files`}
          />
          <FeatureCard
            title="Network"
            href={"/network" as Route}
            source={peers.source}
            subtitle="Peer inventory"
            value={`${peers.peers.length.toLocaleString()} peers`}
          />
          <FeatureCard
            title="L2 modules"
            href={"/l2" as Route}
            source={ipndht.source}
            subtitle="AI + InfoLAW + more"
            value="View modules"
          />
          <FeatureCard
            title="Status"
            href={"/status" as Route}
            source={statusSource}
            subtitle="Operator + AI"
            value={`${LABEL_FINALIZED_ROUND_INDEX} #${finalizedRoundIndex?.toLocaleString() ?? "—"} · ${validatorsOnline ?? "—"} online`}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="L1 consensus snapshot"
          description="Fields sourced from /status (no invented totals)"
          headerSlot={<SourceBadge source={statusSource} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label={LABEL_IPPAN_TIME} value={status.head.ippan_time_ms.toLocaleString()} secondary={`UTC ${formatMs(status.head.ippan_time_ms)}`} tooltip={TIP_IPPAN_TIME} />
            <DetailItem
              label={LABEL_FINALIZED_ROUND_INDEX}
              value={finalizedRoundIndex !== undefined ? `#${finalizedRoundIndex.toLocaleString()}` : "—"}
              tooltip={TIP_FINALIZED_ROUND_INDEX}
            />
            <DetailItem label="Observed round (local)" value={observedRoundId !== undefined ? `#${observedRoundId.toLocaleString()}` : "—"} tooltip="Round reported by this explorer’s RPC node; may be ahead of finality." />
            <DetailItem label="HashTimer seq" value={status.head.hash_timer_seq ?? "—"} />
            <DetailItem label="Validators online" value={validatorsOnline !== undefined ? validatorsOnline.toLocaleString() : "—"} />
          </div>
        </Card>

        <Card
          title="Network peers"
          description="Peer inventory from /peers"
          headerSlot={<SourceBadge source={peers.source} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Total peers" value={peers.peers.length.toLocaleString()} />
            <DetailItem
              label="Last-seen field"
              value={peers.peers.some((peer) => typeof peer.last_seen_ms === "number") ? "Available" : "—"}
            />
          </div>
        </Card>

        <Card
          title="IPNDHT"
          description="Files + handles registered against IPNDHT"
          headerSlot={<SourceBadge source={ipndht.source} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Files" value={ipndht.summary.files_count.toLocaleString()} />
            <DetailItem label="Handles" value={ipndht.summary.handles_count.toLocaleString()} />
            <DetailItem
              label="Providers"
              value={ipndht.summary.providers_count !== undefined ? ipndht.summary.providers_count.toLocaleString() : "—"}
            />
            <DetailItem label="DHT peers" value={ipndht.summary.dht_peers_count !== undefined ? ipndht.summary.dht_peers_count.toLocaleString() : "—"} />
          </div>
        </Card>
      </div>

      <Suspense fallback={<div className="h-32 rounded-lg border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">Loading graphs…</div>}>
        <DashboardGraphs status={status} peersCount={peers.peers.length} />
      </Suspense>

      <Card
        title="Recent activity"
        description="Latest blocks/rounds/validators if your /status endpoint provides them"
        headerSlot={<SourceBadge source={statusSource} />}
      >
        <StatusDataTabs
          blocks={status.latest_blocks}
          rounds={status.latest_rounds}
          validators={status.consensus?.validators}
        />
      </Card>
    </div>
  );
}

function DetailItem({
  label,
  value,
  secondary,
  tooltip
}: {
  label: string;
  value: string | number | ReactNode;
  secondary?: string;
  tooltip?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        {tooltip && (
          <span
            className="cursor-help select-none rounded-full border border-slate-700/70 bg-slate-900/70 px-1.5 py-0.5 text-[10px] leading-none text-slate-300"
            title={tooltip}
          >
            i
          </span>
        )}
      </p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
      {secondary && <p className="text-xs text-slate-400">{secondary}</p>}
    </div>
  );
}

function FeatureCard({
  title,
  subtitle,
  href,
  value,
  source
}: {
  title: string;
  subtitle: string;
  href: Route;
  value: string | ReactNode;
  source: "rpc" | "mock";
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-800/70 bg-slate-950/50 px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{subtitle}</p>
          <p className="text-lg font-semibold text-slate-100">{title}</p>
        </div>
        <SourceBadge source={source} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm text-slate-200">{value}</div>
        <Link href={href} className="text-xs text-emerald-300 underline-offset-4 hover:underline">
          Open
        </Link>
      </div>
    </div>
  );
}
