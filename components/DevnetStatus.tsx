"use client";

import { useEffect, useMemo, useState } from "react";
import { IPPAN_RPC_BASE } from "@/lib/rpc";
import type { StatusResponseV1 } from "@/types/rpc";
import { StatusPill } from "@/components/ui/StatusPill";

type NodeStatus = {
  name: string;
  url: string;
  ok: boolean;
  lastRound?: number;
  lastHashTimer?: string;
};

const DEVNET_NODES: { name: string; url: string }[] = [
  { name: "Node 1 (Nuremberg)", url: "http://188.245.97.41:8080" },
  { name: "Node 2 (Helsinki)", url: "http://135.181.145.174:8080" },
  { name: "Node 3 (Singapore)", url: "http://5.223.51.238:8080" },
  { name: "Node 4 (Ashburn, USA)", url: "http://178.156.219.107:8080" },
];

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

function getConfiguredDevnetNodes(): { name: string; url: string }[] {
  const raw = process.env.NEXT_PUBLIC_IPPAN_DEVNET_NODES;
  if (!raw) return DEVNET_NODES;

  const urls = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeBase);

  if (!urls.length) return DEVNET_NODES;

  return urls.map((url, idx) => {
    const known = DEVNET_NODES.find((n) => normalizeBase(n.url) === url);
    return {
      name: known?.name ?? `Node ${idx + 1}`,
      url,
    };
  });
}

async function fetchNodeStatus(url: string): Promise<Pick<NodeStatus, "lastRound" | "lastHashTimer"> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${normalizeBase(url)}/status`, { cache: "no-store", signal: controller.signal });
    if (!res.ok) return null;
    const json = (await res.json()) as Partial<StatusResponseV1> & Record<string, unknown>;

    const head = (json as any)?.head;
    const lastRoundRaw = head?.round_id ?? head?.round_height ?? (json as any)?.round_height ?? (json as any)?.round;
    const lastRound = typeof lastRoundRaw === "number" ? lastRoundRaw : undefined;

    const lastHashTimerRaw = head?.hash_timer_id ?? (json as any)?.hash_timer_id;
    const lastHashTimer = typeof lastHashTimerRaw === "string" ? lastHashTimerRaw : undefined;

    return { lastRound, lastHashTimer };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function DevnetStatus() {
  const nodeList = useMemo(() => getConfiguredDevnetNodes(), []);
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      const results = await Promise.all(
        nodeList.map(async (n) => {
          const info = await fetchNodeStatus(n.url);
          return {
            name: n.name,
            url: n.url,
            ok: info !== null,
            lastRound: info?.lastRound,
            lastHashTimer: info?.lastHashTimer,
          } satisfies NodeStatus;
        }),
      );

      if (!cancelled) {
        setNodes(results);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nodeList]);

  const configuredBase = normalizeBase(IPPAN_RPC_BASE);
  const baseIsInNodeList = nodeList.some((n) => normalizeBase(n.url) === configuredBase);

  return (
    <div className="space-y-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <div className="font-semibold text-slate-100">IPPAN DevNet</div>
        <StatusPill status={nodes.some((n) => n.ok) ? "ok" : "error"} />
      </div>

      <div className="text-slate-400">
        4 validator nodes + tx bot at <code className="rounded bg-slate-900/60 px-1 py-0.5 text-slate-200">88.198.26.37</code>
      </div>

      <div className="text-slate-400">
        Explorer RPC base:{" "}
        <code className="break-all rounded bg-slate-900/60 px-1 py-0.5 text-slate-200">{configuredBase}</code>{" "}
        {!baseIsInNodeList && <span className="text-amber-300">(not in configured node list)</span>}
      </div>

      {loading ? (
        <div className="text-slate-400">Checking nodes…</div>
      ) : (
        <ul className="space-y-1">
          {nodes.map((n) => (
            <li key={n.url} className="flex flex-col gap-0.5 rounded-lg border border-slate-800/70 bg-slate-950/40 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium text-slate-200">
                  {n.name}{" "}
                  <span className="text-[10px] font-normal text-slate-500">
                    ({normalizeBase(n.url).replace("http://", "")})
                  </span>
                </div>
                <div className={n.ok ? "text-emerald-300" : "text-slate-400"}>{n.ok ? "OK" : "offline / no status"}</div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
                <span>round: {n.lastRound ?? "—"}</span>
                <span className="break-all">hashTimer: {n.lastHashTimer ?? "—"}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

