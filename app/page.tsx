import CopyButton from "@/components/common/CopyButton";
import StatusDataTabs from "@/components/common/StatusDataTabs";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Stat } from "@/components/ui/Stat";
import { StatusPill } from "@/components/ui/StatusPill";
import { fetchJson } from "@/lib/api";
import { formatTimestamp } from "@/lib/format";
import { getStatus } from "@/lib/mockData";
import type { StatusResponseV1 } from "@/types/rpc";

const rpcBase = process.env.NEXT_PUBLIC_IPPAN_RPC_URL ?? "http://localhost:8080";

export default async function DashboardPage() {
  const status = await getStatusData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="HashTimer dashboard"
        description="HashTimer-first explorer view with live consensus, readiness, and validator metrics"
        actions={
          <a
            href={`${rpcBase}/status`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
          >
            View /status JSON
          </a>
        }
      />

      <Card
        title="Head HashTimer"
        description="Primary anchor for navigation and export"
        headerSlot={<CopyButton text={status.head.hash_timer_id} label="Copy HashTimer" />}
      >
        <div className="flex flex-wrap items-center gap-3 text-base">
          <p className="font-mono text-lg text-emerald-100">{status.head.hash_timer_id}</p>
          <StatusPill status={status.head.finalized ? "ok" : "warn"} />
          {status.head.hash_timer_seq && (
            <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-300">Seq {status.head.hash_timer_seq}</span>
          )}
        </div>
        <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="IPPAN time" value={formatTimestamp(status.head.ippan_time)} />
          <DetailItem label="Round height" value={`#${status.head.round_height.toLocaleString()}`} />
          <DetailItem label="Block height" value={`#${status.head.block_height.toLocaleString()}`} />
          <DetailItem label="Finalized" value={status.head.finalized ? "Finalized" : "Pending"} />
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Finalized rounds" value={formatNumber(status.counters.finalized_rounds)} />
        <Stat label="Transactions" value={formatNumber(status.counters.transactions_total)} />
        <Stat label="Issuance" value={`${formatNumber(status.counters.total_issuance)} IPN`} />
        <Stat
          label="Accounts"
          value={formatNumber(status.counters.accounts_total)}
          hint={status.counters.holders_total ? `${formatNumber(status.counters.holders_total)} holders` : undefined}
        />
        <Stat label="HashTimers" value={formatNumber(status.counters.hash_timers_total)} />
        <Stat
          label="AI requests"
          value={status.counters.ai_requests_total ? formatNumber(status.counters.ai_requests_total) : "—"}
          hint="From /ai/status"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Live network" description="Consensus tempo and operator activity">
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Avg round time" value={formatMs(status.live.round_time_avg_ms)} />
            <DetailItem label="Finality time" value={formatMs(status.live.finality_time_ms)} />
            <DetailItem label="Current epoch" value={`Epoch ${status.live.current_epoch}`} />
            <DetailItem label="Active operators" value={formatNumber(status.live.active_operators)} />
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Epoch progress</span>
              <span>{status.live.epoch_progress_pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${Math.min(Math.max(status.live.epoch_progress_pct, 0), 100)}%` }}
              />
            </div>
          </div>
        </Card>

        <Card title="D-GBDT Dataset readiness" description="Signals needed for dataset exports and scoring">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                status.consensus.metrics_available
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-500/40 bg-amber-500/10 text-amber-200"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" />
              {status.consensus.metrics_available ? "Metrics available" : "Metrics unavailable"}
            </span>
            <p className="text-xs text-slate-400">If false, exported CSV will be empty.</p>
          </div>
          <div className="grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
            <DetailItem label="Validator dataset fields" value="uptime, validated/missed, latency, slashing, stake, peer quality" />
            <DetailItem label="Validators tracked" value={`${status.consensus.validators.length} nodes`} />
          </div>
        </Card>
      </div>

      <Card
        title="Network activity"
        description="Blocks, rounds, and validator dataset columns keyed by HashTimer"
        headerSlot={<p className="text-xs text-slate-500">Server-fetched with mock fallback</p>}
      >
        <StatusDataTabs
          blocks={status.latest_blocks}
          rounds={status.latest_rounds}
          validators={status.consensus.validators}
        />
      </Card>
    </div>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatMs(value: number) {
  return `${value.toLocaleString()} ms`;
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

async function getStatusData(): Promise<StatusResponseV1> {
  try {
    return await fetchJson<StatusResponseV1>("/status");
  } catch (error) {
    console.warn("Falling back to mock status due to RPC error", error);
    return getStatus();
  }
}
