import JsonViewer from "@/components/common/JsonViewer";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { getAiStatus, getHealthStatus } from "@/lib/mockData";

export default async function StatusPage() {
  const [health, ai] = await Promise.all([getHealthStatus(), getAiStatus()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Node & AI Status" description="Consensus, storage, DHT, and AI health signals" />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatusCard title="Consensus" healthy={health.consensus} detail="/health.consensus" />
        <StatusCard title="Storage" healthy={health.storage} detail={health.rpc ? "RPC ready" : "RPC issue"} />
        <StatusCard title="DHT files" healthy={health.dhtFile.healthy} detail={`Mode: ${health.dhtFile.mode}`} />
        <StatusCard title="DHT handles" healthy={health.dhtHandle.healthy} detail={`Mode: ${health.dhtHandle.mode}`} />
        <Card title="AI model" description="Status pulled from /ai/status">
          <div className="space-y-2">
            <StatusPill status={ai.usingStub ? "warn" : "ok"} />
            <p className="text-sm text-slate-400">Model hash</p>
            <p className="font-mono text-base text-slate-50">{ai.modelHash}</p>
            <p className="text-xs text-slate-500">Mode: {ai.mode}</p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Raw /health JSON">
          <JsonViewer data={health} />
        </Card>
        <Card title="Raw /ai/status JSON">
          <JsonViewer data={ai} />
        </Card>
      </div>
    </div>
  );
}

function StatusCard({ title, healthy, detail }: { title: string; healthy: boolean; detail?: string }) {
  return (
    <Card title={title} description={detail}>
      <StatusPill status={healthy ? "ok" : "error"} />
    </Card>
  );
}
