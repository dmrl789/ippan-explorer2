"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import JsonViewer from "@/components/common/JsonViewer";
import { CopyButton } from "@/components/common/CopyButton";
import { SourceBadge } from "@/components/common/SourceBadge";

export default function DebugRpcPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/rpc/debug")
      .then((res) => res.json())
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-100">RPC Debugger</h1>
        <div className="flex gap-2">
           {data && (
            <CopyButton 
              text={JSON.stringify(data, null, 2)} 
              label="Copy JSON"
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            />
          )}
        </div>
      </div>

      <p className="text-slate-400">
        Diagnostic information for the DevNet RPC connection (server-side view).
      </p>

      {loading && <div className="text-slate-400">Loading diagnostics...</div>}
      
      {error && (
        <div className="p-4 rounded-lg bg-red-950/30 border border-red-900/50 text-red-300">
          Error loading debug info: {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Gateway Status" headerSlot={<SourceBadge source={data.gateway?.reachable ? "live" : "error"} />}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gateway Reachable</span>
                  <span className={data.gateway?.reachable ? "text-emerald-400" : "text-red-400"}>
                    {data.gateway?.reachable ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Required Endpoints</span>
                  <span className={data.gateway?.all_required_ok ? "text-emerald-400" : "text-amber-400"}>
                    {data.gateway?.all_required_ok ? "OK" : "Partial/Fail"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Latency</span>
                  <span className="text-slate-200">{data.gateway?.status_latency_ms}ms</span>
                </div>
              </div>
            </Card>

            <Card title="Configuration">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">RPC Base</span>
                  <span className="font-mono text-xs text-slate-300 bg-slate-900 px-1 rounded">
                    {data.config?.rpc_base_masked}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">IPPAN_RPC_BASE_URL</span>
                  <span className="text-slate-300">{data.config?.env_vars?.IPPAN_RPC_BASE_URL}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">NEXT_PUBLIC_IPPAN_RPC_BASE</span>
                  <span className="text-slate-300">{data.config?.env_vars?.NEXT_PUBLIC_IPPAN_RPC_BASE}</span>
                </div>
              </div>
            </Card>
          </div>

          <Card title="Full Diagnostic JSON">
            <JsonViewer data={data} />
          </Card>
        </div>
      )}
    </div>
  );
}
