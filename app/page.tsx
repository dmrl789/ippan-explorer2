import Link from "next/link";
import type { Route } from "next";
import { type ReactNode } from "react";
import CopyButton from "@/components/common/CopyButton";
import { SourceBadge } from "@/components/common/SourceBadge";
import { DevnetStatus } from "@/components/DevnetStatus";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { ValidatorSourceBadge, getValidatorSource } from "@/components/common/ValidatorSourceBadge";
import { IppanTimeCard } from "@/components/IppanTimeCard";
import { RawStatusViewer } from "@/components/RawStatusViewer";
import { fetchStatusWithSource } from "@/lib/status";
import { getRpcBaseUrl } from "@/lib/rpcBase";
import { fetchPeers } from "@/lib/peers";
import { fetchIpndht } from "@/lib/ipndht";

// Force dynamic rendering - never use cached/stale data
export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export default async function DashboardPage() {
  const [statusRes, peersRes, ipndht] = await Promise.all([fetchStatusWithSource(), fetchPeers(), fetchIpndht()]);
  const rpcBase = getRpcBaseUrl();
  const status = statusRes.ok ? statusRes.status : undefined;
  const statusSource = statusRes.ok ? statusRes.source : "error";
  const rawStatus = statusRes.ok ? statusRes.rawStatus : (statusRes.rawStatus ?? null);
  const ippanTime = statusRes.ok ? statusRes.ippanTime : null;
  const hashTimerData = statusRes.ok ? statusRes.hashTimerData : null;
  const peers = peersRes.peers;
  const peersSource = peersRes.ok ? peersRes.source : "error";

  // DevNet is considered OK if we got valid status data
  const devnetOk = statusRes.ok && status?.status === "ok";
  
  // Get validator count and source info
  const validatorIds = status?.consensus?.validator_ids ?? [];
  const { source: validatorSource, count: validatorCount } = getValidatorSource(status);
  
  // Detect potential issues
  const uniqueValidatorIds = new Set(validatorIds);
  const identityCount = uniqueValidatorIds.size;
  const hasDuplicateValidatorIds = uniqueValidatorIds.size < validatorIds.length && validatorIds.length > 0;
  const hasIdentityUndercount = validatorCount > 1 && validatorIds.length > 0 && identityCount === 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Devnet-only explorer: live IPPAN devnet RPC (no mock/demo data)"
        actions={
          <a
            href="/api/rpc/status"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
          >
            View /status JSON
          </a>
        }
      />

      <div className="text-xs text-slate-500">
        Connected to IPPAN DevNet via <code className="rounded bg-slate-900/60 px-1 py-0.5 text-slate-300">{rpcBase}</code>
      </div>

      <Card title="DevNet status" description="Live status from single canonical RPC gateway">
        <DevnetStatus />
      </Card>

      {/* Validator Identity Warning Banner */}
      {devnetOk && (hasDuplicateValidatorIds || hasIdentityUndercount) && (
        <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-amber-300 font-medium text-sm">⚠️ Validator Identity Warning</span>
            <StatusPill status="warn" />
          </div>
          {hasDuplicateValidatorIds ? (
            <p className="text-sm text-slate-300">
              <strong>Duplicate validator IDs detected:</strong> The gateway reports {validatorIds.length} validator entries 
              but only {uniqueValidatorIds.size} unique ID{uniqueValidatorIds.size === 1 ? "" : "s"}. 
              This may indicate nodes sharing the same identity key.
            </p>
          ) : hasIdentityUndercount ? (
            <p className="text-sm text-slate-300">
              <strong>Validator identity undercount:</strong> Gateway reports {validatorCount} validators but only {identityCount} validator identity is exposed in{" "}
              <code className="bg-slate-900/60 px-1 rounded">/status.consensus.validator_ids</code>. This is usually a status field limitation (not necessarily a network fault).
            </p>
          ) : null}
          <div className="mt-2">
            <Link 
              href="/status" 
              className="text-xs text-amber-200 underline-offset-4 hover:underline"
            >
              View Validator Identities →
            </Link>
          </div>
        </div>
      )}

      {/* Main Node Status Card */}
      <Card
        title="Node Status"
        description="Live status from the connected DevNet node"
        headerSlot={
          status?.node_id ? <CopyButton text={status.node_id} label="Copy Node ID" /> : undefined
        }
      >
        {devnetOk && status ? (
          <>
            <div className="flex flex-wrap items-center gap-3 text-base">
              <span className="font-mono text-lg text-emerald-100">{status.node_id}</span>
              <StatusPill status={status.network_active ? "ok" : "warn"} />
              <SourceBadge source={statusSource} />
              <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-300">v{status.version}</span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              {status.network_active ? "Network active" : "Network inactive"} · {status.peer_count} peers · Round #{status.consensus.round}
            </p>
            <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
              <DetailItem label="Uptime" value={formatUptime(status.uptime_seconds)} />
              <DetailItem label="Peer Count" value={status.peer_count.toString()} />
              <DetailItem 
                label="Mempool Size" 
                value={
                  status.mempool_size === undefined || status.mempool_size === null
                    ? "Not exposed"
                    : status.mempool_size.toString()
                } 
                tooltip={
                  status.mempool_size === undefined || status.mempool_size === null
                    ? "Mempool size is not exposed by this node's /status endpoint."
                    : status.mempool_size === 0
                      ? "Mempool=0 means no pending transactions right now. The network may be idle or transactions are being processed quickly."
                      : "Mempool size = pending transactions at this node."
                }
              />
              <DetailItem label="Consensus Round" value={`#${status.consensus.round}`} />
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3">
            <p className="text-sm text-amber-200/80">Gateway RPC unavailable</p>
            <p className="mt-1 text-xs text-slate-500">
              Unable to reach the canonical DevNet RPC gateway. This may indicate a network issue or the gateway is temporarily down.
            </p>
          </div>
        )}
      </Card>

      {/* IPPAN Time Card - prominent display of network time */}
      <div className="grid gap-4 lg:grid-cols-2">
        <IppanTimeCard
          ippanTime={ippanTime}
          hashTimerData={hashTimerData}
          source={statusSource}
          loading={false}
        />
        
        {/* Quick Node Stats for second column */}
        <Card
          title="Quick Stats"
          description="Key metrics from /status"
          headerSlot={<SourceBadge source={statusSource} />}
        >
          {devnetOk && status ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Consensus Round" value={`#${status.consensus.round}`} />
              <DetailItem 
                label="Validators" 
                value={validatorCount.toString()} 
                secondary={
                  hasDuplicateValidatorIds 
                    ? `${uniqueValidatorIds.size} unique` 
                    : undefined
                }
              />
              <DetailItem label="Peer Count" value={status.peer_count.toString()} />
              <DetailItem 
                label="Mempool Size" 
                value={
                  status.mempool_size === undefined || status.mempool_size === null
                    ? "Not exposed"
                    : status.mempool_size.toString()
                }
              />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/30 p-3">
              <p className="text-sm text-slate-400">Stats unavailable</p>
            </div>
          )}
        </Card>
      </div>

      <Card title="Explore" description="Entry points for L1, IPNDHT, and L2 surfaces">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <FeatureCard
            title="DAG blocks"
            href={"/blocks" as Route}
            source={statusSource}
            subtitle="DAG blocks + transactions"
            value={devnetOk ? "Browse blocks" : "—"}
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
            source={ipndht.ok ? ipndht.source : "error"}
            subtitle="Handles + Files + Providers"
            value={ipndht.ok ? `${ipndht.summary.handles_count} handles · ${ipndht.summary.files_count} files` : "Not available"}
          />
          <FeatureCard
            title="Network"
            href={"/network" as Route}
            source={peersSource}
            subtitle="Peer inventory"
            value={`${peers.length.toLocaleString()} peers`}
          />
          <FeatureCard
            title="L2 modules"
            href={"/l2" as Route}
            source={ipndht.ok ? ipndht.source : "error"}
            subtitle="AI + InfoLAW + more"
            value="View modules"
          />
          <FeatureCard
            title="Status"
            href={"/status" as Route}
            source={statusSource}
            subtitle="Operator + AI"
            value={devnetOk ? `${validatorCount} validators` : "—"}
              warn={hasDuplicateValidatorIds || hasIdentityUndercount}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Consensus & Validators"
          description="Validator metrics from /status"
          headerSlot={<SourceBadge source={statusSource} />}
        >
          {devnetOk && status ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailItem label="Consensus Round" value={`#${status.consensus.round}`} />
                <DetailItem 
                  label="Validators" 
                  value={validatorCount.toString()} 
                  secondary={
                    hasDuplicateValidatorIds 
                      ? `${uniqueValidatorIds.size} unique` 
                      : undefined
                  }
                />
                <DetailItem label="Metrics Available" value={status.consensus.metrics_available ? "Yes" : "No"} />
                <DetailItem label="Network Active" value={status.network_active ? "Yes" : "No"} />
              </div>
              <ValidatorSourceBadge source={validatorSource} />
              {(hasDuplicateValidatorIds || hasIdentityUndercount) && (
                <div className="mt-2 rounded border border-amber-900/50 bg-amber-950/20 px-2 py-1.5">
                  <span className="text-[10px] text-amber-300">
                    {hasDuplicateValidatorIds 
                      ? "⚠️ Duplicate validator IDs detected" 
                      : "⚠️ Validator identity undercount"}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/30 p-3">
              <p className="text-sm text-slate-400">Validator data unavailable</p>
              <p className="mt-1 text-xs text-slate-500">Gateway RPC is unreachable.</p>
            </div>
          )}
        </Card>

        <Card
          title="Network peers"
          description="Peer inventory from /peers"
          headerSlot={<SourceBadge source={peersSource} />}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Total peers" value={peers.length.toLocaleString()} />
            <DetailItem
              label="Last-seen field"
              value={peers.some((peer) => typeof peer.last_seen_ms === "number") ? "Available" : "—"}
            />
          </div>
          {!peersRes.ok && (
            <div className="mt-3 rounded-lg border border-slate-800/70 bg-slate-900/30 p-3">
              <p className="text-sm text-slate-400">Peer inventory unavailable from gateway</p>
              <p className="mt-1 text-xs text-slate-500">
                {peersRes.error?.includes("unavailable") ? "Gateway RPC is unreachable." : peersRes.error ?? "Unknown error"}
              </p>
            </div>
          )}
        </Card>

        <Card
          title="IPNDHT"
          description="Files + handles registered against IPNDHT"
          headerSlot={<SourceBadge source={ipndht.ok ? ipndht.source : "error"} />}
        >
          {ipndht.ok ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Files" value={ipndht.summary.files_count.toLocaleString()} />
              <DetailItem label="Handles" value={ipndht.summary.handles_count.toLocaleString()} />
              <DetailItem
                label="Providers"
                value={ipndht.summary.providers_count !== undefined ? ipndht.summary.providers_count.toLocaleString() : "—"}
              />
              <DetailItem label="DHT peers" value={ipndht.summary.dht_peers_count !== undefined ? ipndht.summary.dht_peers_count.toLocaleString() : "—"} />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-800/70 bg-slate-900/30 p-3">
              <p className="text-sm text-slate-400">
                {"errorCode" in ipndht && ipndht.errorCode === "endpoint_not_available"
                  ? "IPNDHT endpoint not implemented yet (404 expected for this DevNet)."
                  : "IPNDHT endpoint not available."}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                This is normal during early DevNet phases. The node is online.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* AI Status Card */}
      {devnetOk && status?.ai && (
        <Card
          title="AI Status"
          description="AI model and consensus configuration"
          headerSlot={<SourceBadge source={statusSource} />}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="AI Enabled" value={status.ai.enabled ? "Yes" : "No"} />
            <DetailItem label="Consensus Mode" value={status.ai.consensus_mode} />
            <DetailItem label="Using Stub" value={status.ai.using_stub ? "Yes" : "No"} />
            <DetailItem label="Model Version" value={status.ai.model_version} />
            <DetailItem label="Shadow Loaded" value={status.ai.shadow_loaded ? "Yes" : "No"} />
            <DetailItem
              label="Model Hash"
              value={
                <span className="font-mono text-xs" title={status.ai.model_hash}>
                  {status.ai.model_hash.slice(0, 12)}…
                </span>
              }
            />
          </div>
        </Card>
      )}

      {/* Validators Table */}
      {devnetOk && status?.consensus?.validators && (
        <Card
          title="Validators"
          description="Active validators on the DevNet"
          headerSlot={
            <div className="flex items-center gap-2">
              <SourceBadge source={statusSource} />
              {(hasDuplicateValidatorIds || hasIdentityUndercount) && (
                <span className="rounded border border-amber-700/50 bg-amber-900/30 px-1.5 py-0.5 text-[10px] text-amber-300">
                  ⚠️ identity issue
                </span>
              )}
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-4">Validator ID</th>
                  <th className="pb-2 pr-4">Blocks Proposed</th>
                  <th className="pb-2 pr-4">Blocks Verified</th>
                  <th className="pb-2 pr-4">Honesty</th>
                  <th className="pb-2 pr-4">Latency</th>
                  <th className="pb-2 pr-4">Uptime</th>
                  <th className="pb-2">Stake (μIPN)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(status.consensus.validators).map(([id, v]) => (
                  <tr key={id} className="border-b border-slate-800/50">
                    <td className="py-2 pr-4 font-mono text-xs text-emerald-100">
                      {id.slice(0, 8)}…{id.slice(-6)}
                      {id === status.consensus.self_id && (
                        <span className="ml-2 rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] text-emerald-300">self</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-slate-300">{v.blocks_proposed.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-slate-300">{v.blocks_verified.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-slate-300">{(v.honesty / 100).toFixed(2)}%</td>
                    <td className="py-2 pr-4 text-slate-300">{v.latency}ms</td>
                    <td className="py-2 pr-4 text-slate-300">{(v.uptime / 100).toFixed(2)}%</td>
                    <td className="py-2 text-slate-300">{parseInt(v.stake.micro_ipn).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Raw /status JSON Viewer */}
      {rawStatus && (
        <RawStatusViewer
          data={rawStatus}
          title="Raw /status JSON"
          description="Complete response from gateway RPC - includes all fields (known and unknown)"
          defaultView="collapsed"
        />
      )}
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
  source,
  warn = false,
}: {
  title: string;
  subtitle: string;
  href: Route;
  value: string | ReactNode;
  source: "live" | "error";
  warn?: boolean;
}) {
  return (
    <div className={`flex flex-col justify-between rounded-lg border px-4 py-3 ${
      warn 
        ? "border-amber-900/50 bg-amber-950/20" 
        : "border-slate-800/70 bg-slate-950/50"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{subtitle}</p>
          <p className="text-lg font-semibold text-slate-100">{title}</p>
        </div>
        <div className="flex items-center gap-1">
          {warn && (
            <span className="text-amber-400 text-xs" title="Potential identity issue detected">⚠️</span>
          )}
          <SourceBadge source={source} />
        </div>
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
