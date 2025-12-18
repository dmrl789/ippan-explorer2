import JsonViewer from "@/components/common/JsonViewer";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { SourceBadge } from "@/components/common/SourceBadge";
import { StatusPill } from "@/components/ui/StatusPill";
import { fetchAiStatusWithSource } from "@/lib/ai";
import { fetchHealthWithSource } from "@/lib/health";
import { fetchStatusWithSource } from "@/lib/status";
import { LABEL_FINALIZED_ROUND_INDEX, LABEL_IPPAN_TIME } from "@/lib/terminology";

export default async function StatusPage() {
  const [healthRes, aiRes, statusRes] = await Promise.all([fetchHealthWithSource(), fetchAiStatusWithSource(), fetchStatusWithSource()]);
  const healthSource = healthRes.ok ? healthRes.source : "error";
  const aiSource = aiRes.ok ? aiRes.source : "error";
  const statusSource = statusRes.ok ? statusRes.source : "error";

  const status = statusRes.ok ? statusRes.status : undefined;
  const observedRoundId = status?.head.round_id ?? status?.head.round_height;
  const finalizedRoundIndex = status?.counters?.finalized_rounds;
  const validatorsOnline = status?.live.validators_online ?? status?.live.active_operators;

  return (
    <div className="space-y-6">
      <PageHeader title="Status" description="Operator / cluster view (health + consensus + AI) from devnet RPC" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Node health" description="From /health" headerSlot={<SourceBadge source={healthSource} />}>
          {healthRes.ok && healthRes.health ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <HealthRow label="Consensus" ok={healthRes.health.consensus} detail="consensus" />
              <HealthRow label="RPC" ok={healthRes.health.rpc} detail="rpc" />
              <HealthRow label="Storage" ok={healthRes.health.storage} detail="storage" />
              <HealthRow label="DHT files" ok={healthRes.health.dhtFile.healthy} detail={`mode: ${healthRes.health.dhtFile.mode}`} />
              <HealthRow label="DHT handles" ok={healthRes.health.dhtHandle.healthy} detail={`mode: ${healthRes.health.dhtHandle.mode}`} />
            </div>
          ) : (
            <p className="text-sm text-slate-400">{healthRes.ok ? "Health unavailable." : healthRes.error}</p>
          )}
        </Card>

        <Card title="Consensus snapshot" description="From /status" headerSlot={<SourceBadge source={statusSource} />}>
          {status ? (
            <div className="space-y-3 text-sm text-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Finalized</span>
                <StatusPill status={status.head.finalized ? "ok" : "warn"} />
              </div>
              <KeyValue label={LABEL_IPPAN_TIME} value={status.head.ippan_time_ms !== undefined ? status.head.ippan_time_ms.toLocaleString() : "—"} />
              <KeyValue
                label={LABEL_FINALIZED_ROUND_INDEX}
                value={finalizedRoundIndex !== undefined ? `#${finalizedRoundIndex.toLocaleString()}` : "—"}
              />
              <KeyValue label="Observed round (local)" value={observedRoundId !== undefined ? `#${observedRoundId.toLocaleString()}` : "—"} />
              <KeyValue label="DAG blocks observed (local)" value={`#${status.head.block_height.toLocaleString()}`} />
              <KeyValue label="Validators online" value={validatorsOnline !== undefined ? validatorsOnline.toLocaleString() : "—"} />
              <p className="text-xs text-slate-500">
                Local counters reflect this explorer’s RPC node view; IPPAN finality is tracked by rounds (not a global block height).
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{statusRes.ok ? "Status unavailable." : statusRes.error}</p>
          )}
        </Card>

        <Card title="AI status" description="From /ai/status" headerSlot={<SourceBadge source={aiSource} />}>
          {aiRes.ok && aiRes.ai ? (
            <div className="space-y-2">
              <StatusPill status={aiRes.ai.usingStub ? "warn" : "ok"} />
              <p className="text-sm text-slate-400">Model hash</p>
              <p className="font-mono text-base text-slate-50 break-all">{aiRes.ai.modelHash}</p>
              <p className="text-xs text-slate-500">Mode: {aiRes.ai.mode}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{aiRes.ok ? "AI status unavailable." : aiRes.error}</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Raw /health JSON">
          <JsonViewer data={healthRes.ok ? healthRes.health : { error: healthRes.error }} />
        </Card>
        <Card title="Raw /status JSON">
          <JsonViewer data={statusRes.ok ? statusRes.status : { error: statusRes.error }} />
        </Card>
      </div>

      <Card title="Raw /ai/status JSON">
        <JsonViewer data={aiRes.ok ? aiRes.ai : { error: aiRes.error }} />
      </Card>
    </div>
  );
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        {detail && <p className="text-xs text-slate-400">{detail}</p>}
      </div>
      <StatusPill status={ok ? "ok" : "error"} />
    </div>
  );
}

function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
  );
}
