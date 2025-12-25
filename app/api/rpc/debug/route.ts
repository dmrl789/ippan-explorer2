import { NextResponse } from "next/server";
import { proxyRpcRequest, getServerRpcBase } from "@/lib/rpcProxy";
import { isDemoMode } from "@/lib/demoMode";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Debug endpoint that returns a one-shot diagnostic bundle.
 * Useful for debugging RPC connectivity issues from Vercel.
 * 
 * GET /api/rpc/debug
 */
export async function GET() {
  const ts = Date.now();
  const rpcBase = getServerRpcBase();
  const demoMode = isDemoMode();

  // Probe multiple endpoints in parallel
  const [statusProbe, healthProbe, blocksProbe, peersProbe] = await Promise.all([
    proxyRpcRequest("/status", { timeout: 5000 }),
    proxyRpcRequest("/health", { timeout: 5000 }),
    proxyRpcRequest("/blocks", { timeout: 5000 }),
    proxyRpcRequest("/peers", { timeout: 5000 }),
  ]);

  const probes = {
    status: {
      ok: statusProbe.ok,
      status_code: statusProbe.status_code,
      error: statusProbe.ok ? undefined : statusProbe.error,
      detail: statusProbe.ok ? undefined : statusProbe.detail,
      latency_ms: statusProbe.ts ? ts - statusProbe.ts : undefined,
      has_node_id: statusProbe.ok && statusProbe.data && typeof (statusProbe.data as any).node_id === "string",
    },
    health: {
      ok: healthProbe.ok,
      status_code: healthProbe.status_code,
      error: healthProbe.ok ? undefined : healthProbe.error,
      detail: healthProbe.ok ? undefined : healthProbe.detail,
    },
    blocks: {
      ok: blocksProbe.ok,
      status_code: blocksProbe.status_code,
      error: blocksProbe.ok ? undefined : blocksProbe.error,
      detail: blocksProbe.ok ? undefined : blocksProbe.detail,
      endpoint_available: blocksProbe.ok || blocksProbe.status_code !== 404,
    },
    peers: {
      ok: peersProbe.ok,
      status_code: peersProbe.status_code,
      error: peersProbe.ok ? undefined : peersProbe.error,
      detail: peersProbe.ok ? undefined : peersProbe.detail,
      endpoint_available: peersProbe.ok || peersProbe.status_code !== 404,
    },
  };

  const allEndpointsOk = statusProbe.ok && healthProbe.ok;
  const gatewayReachable = statusProbe.ok || healthProbe.ok || blocksProbe.ok || peersProbe.ok;

  // Extract status data if available
  const statusData = statusProbe.ok && statusProbe.data ? statusProbe.data as any : null;

  return NextResponse.json({
    ok: allEndpointsOk,
    ts,
    ts_iso: new Date(ts).toISOString(),
    
    config: {
      rpc_base: rpcBase,
      demo_mode: demoMode,
      env_vars_checked: [
        "IPPAN_RPC_BASE_URL",
        "NEXT_PUBLIC_IPPAN_RPC_BASE",
        "NEXT_PUBLIC_IPPAN_RPC_URL",
        "NEXT_PUBLIC_NODE_RPC",
      ],
    },
    
    gateway: {
      reachable: gatewayReachable,
      all_required_ok: allEndpointsOk,
    },
    
    probes,
    
    node_info: statusData ? {
      node_id: statusData.node_id,
      version: statusData.version,
      status: statusData.status,
      network_active: statusData.network_active,
      peer_count: statusData.peer_count,
      mempool_size: statusData.mempool_size,
      consensus_round: statusData.consensus?.round,
      validator_count: statusData.consensus?.validator_ids?.length,
    } : null,

    troubleshooting: !gatewayReachable ? {
      message: "RPC gateway is unreachable",
      steps: [
        `1. Verify IPPAN_RPC_BASE_URL is set correctly: ${rpcBase}`,
        "2. Check if the gateway is accessible from your deployment environment",
        "3. Verify there are no firewall/network restrictions",
        "4. Check if the gateway is running and healthy",
      ],
    } : !allEndpointsOk ? {
      message: "Some RPC endpoints are not responding correctly",
      steps: [
        "1. Check the 'probes' section above for specific endpoint failures",
        "2. 404 on /blocks or /peers may be expected for early DevNet phases",
        "3. Verify the node is fully synced and operational",
      ],
    } : null,
  }, { status: 200 });
}
