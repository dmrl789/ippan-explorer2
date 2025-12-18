import { Card } from "./ui/Card";
import type { StatusResponseV1 } from "@/types/rpc";

export function DashboardGraphs(_props: { status: StatusResponseV1; peersCount?: number }) {
  return (
    <Card title="Graphs" description="History charts (planned)">
      <div className="space-y-2 text-sm text-slate-300">
        <p className="text-slate-200">
          Graphs will activate once a history RPC is implemented (e.g. blocks/rounds time series).
        </p>
        <p className="text-xs text-slate-500">
          Today the explorer only has snapshot data from <span className="font-mono">/status</span>.
        </p>
      </div>
    </Card>
  );
}
