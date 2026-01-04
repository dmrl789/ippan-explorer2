import { NextResponse } from "next/server";
import { proxyRpcRequest, getServerRpcBase } from "@/lib/rpcProxy";
import { isDemoMode } from "@/lib/demoMode";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface ProbeResult {
  ok: boolean;
  status_code?: number;
  error?: string;
  detail?: string;
  latency_ms?: number;
  endpoint_available: boolean;
  sample_data?: unknown;
}

async function probeEndpoint(
  path: string,
  ts: number,
  options: { timeout?: number; extractSample?: (data: unknown) => unknown } = {}
): Promise<ProbeResult> {
  const { timeout = 5000, extractSample } = options;
  const start = Date.now();
  const result = await proxyRpcRequest(path, { timeout });
  const latency_ms = Date.now() - start;

  if (result.ok) {
    return {
      ok: true,
      status_code: result.status_code,
      latency_ms,
      endpoint_available: true,
      sample_data: extractSample ? extractSample(result.data) : undefined,
    };
  }

  return {
    ok: false,
    status_code: result.status_code,
    error: result.error,
    detail: result.detail,
    latency_ms,
    endpoint_available: result.status_code !== 404,
  };
}

/**
 * Debug endpoint that returns a comprehensive diagnostic bundle.
 * Useful for debugging RPC connectivity issues from Vercel.
 * 
 * GET /api/rpc/debug
 * 
 * Returns a probe matrix showing which endpoints are available and their status.
 */
export async function GET() {
  const ts = Date.now();
  const rpcBase = getServerRpcBase();
  const demoMode = isDemoMode();

  // Probe all key endpoints in parallel
  const [
    statusProbe,
    healthProbe,
    txRecentProbe,
    blocksListProbe,
    peersProbe,
  ] = await Promise.all([
    probeEndpoint("/status", ts, {
      extractSample: (data: unknown) => {
        const d = data as Record<string, unknown>;
        return {
          has_node_id: typeof d?.node_id === "string",
          has_peer_count: typeof d?.peer_count === "number",
          has_consensus: !!d?.consensus,
        };
      },
    }),
    probeEndpoint("/health", ts),
    probeEndpoint("/tx/recent?limit=5", ts, {
      extractSample: (data: unknown) => {
        // Accept array or { items: [] } or { txs: [] }
        const arr = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.items)
            ? (data as any).items
            : Array.isArray((data as any)?.txs)
              ? (data as any).txs
              : [];
        return { count: arr.length, has_data: arr.length > 0 };
      },
    }),
    probeEndpoint("/blocks?limit=5", ts, {
      extractSample: (data: unknown) => {
        const arr = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.blocks)
            ? (data as any).blocks
            : [];
        return { count: arr.length, has_data: arr.length > 0 };
      },
    }),
    probeEndpoint("/peers", ts, {
      extractSample: (data: unknown) => {
        const arr = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.peers)
            ? (data as any).peers
            : [];
        return { count: arr.length };
      },
    }),
  ]);

  // Test a specific block/tx endpoint (optional, won't fail if no data)
  // These are tested separately since they require a valid ID
  const txStatusProbe: ProbeResult = {
    ok: true,
    endpoint_available: txRecentProbe.ok, // inferred from tx/recent
    detail: "Endpoint availability inferred from /tx/recent",
  };

  const blockByHashProbe: ProbeResult = {
    ok: true,
    endpoint_available: true, // /block/:id is always expected to be available
    detail: "Endpoint availability assumed (requires valid block hash to test)",
  };

  const roundByIdProbe: ProbeResult = {
    ok: true,
    endpoint_available: true, // assumed
    detail: "Endpoint availability assumed (requires valid round ID to test)",
  };

  const probeMatrix = {
    // Core required endpoints
    status: {
      ...statusProbe,
      required: true,
      description: "Node status and consensus info",
    },
    health: {
      ...healthProbe,
      required: false,
      description: "Simple health check",
    },
    // Transaction endpoints
    tx_recent: {
      ...txRecentProbe,
      required: true,
      description: "Recent transactions list",
      endpoint: "/tx/recent?limit=N",
    },
    tx_status: {
      ...txStatusProbe,
      required: false,
      description: "Transaction status by hash",
      endpoint: "/tx/status/:hash",
    },
    tx_detail: {
      ok: txRecentProbe.ok,
      endpoint_available: txRecentProbe.endpoint_available,
      required: true,
      description: "Transaction detail by hash",
      endpoint: "/tx/:hash",
    },
    // Block endpoints
    blocks_list: {
      ...blocksListProbe,
      required: false,
      description: "Blocks list (may be 404, fallback available)",
      endpoint: "/blocks?limit=N",
      fallback_available: true,
    },
    block_by_hash: {
      ...blockByHashProbe,
      required: true,
      description: "Block detail by hash",
      endpoint: "/block/:id",
    },
    // Round endpoints
    round_by_id: {
      ...roundByIdProbe,
      required: false,
      description: "Round detail by ID",
      endpoint: "/round/:id",
    },
    // Network endpoints
    peers: {
      ...peersProbe,
      required: false,
      description: "Connected peers list",
    },
  };

  // Calculate summary
  const requiredEndpoints = Object.entries(probeMatrix).filter(([, v]) => v.required);
  const requiredOk = requiredEndpoints.every(([, v]) => v.ok || v.endpoint_available);
  const gatewayReachable = statusProbe.ok || healthProbe.ok || txRecentProbe.ok;

  // Extract status data if available
  const statusData = statusProbe.ok
    ? await proxyRpcRequest("/status", { timeout: 2000 }).then((r) =>
        r.ok ? (r.data as Record<string, unknown>) : null
      )
    : null;

  const response = {
    ok: gatewayReachable && requiredOk,
    ts,
    ts_iso: new Date(ts).toISOString(),

    config: {
      rpc_base: rpcBase,
      rpc_base_masked: rpcBase.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@"),
      demo_mode: demoMode,
      env_vars: {
        IPPAN_RPC_BASE_URL: process.env.IPPAN_RPC_BASE_URL ? "set" : "unset",
        NEXT_PUBLIC_IPPAN_RPC_BASE: process.env.NEXT_PUBLIC_IPPAN_RPC_BASE ? "set" : "unset",
        NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE || "unset",
      },
    },

    gateway: {
      reachable: gatewayReachable,
      all_required_ok: requiredOk,
      status_latency_ms: statusProbe.latency_ms,
    },

    probe_matrix: probeMatrix,

    node_info: statusData
      ? {
          node_id: statusData.node_id,
          version: statusData.version,
          status: statusData.status,
          network_active: statusData.network_active,
          peer_count: statusData.peer_count,
          mempool_size: statusData.mempool_size,
          consensus_round: (statusData.consensus as Record<string, unknown>)?.round,
          validator_count:
            typeof (statusData as any).validator_count === "number"
              ? (statusData as any).validator_count
              : Array.isArray((statusData.consensus as Record<string, unknown>)?.validator_ids)
                ? (((statusData.consensus as Record<string, unknown>)?.validator_ids as unknown[])?.length ?? 0)
                : typeof (statusData.consensus as any)?.validators === "object" && (statusData.consensus as any)?.validators
                  ? Object.keys((statusData.consensus as any).validators).length
                  : 0
            : undefined,
        }
      : null,

    fallback_info: {
      blocks_list_fallback: !blocksListProbe.ok,
      blocks_fallback_method: !blocksListProbe.ok
        ? "Derive from /tx/recent → collect unique block_hash → hydrate via /block/:hash"
        : null,
    },

    troubleshooting: !gatewayReachable
      ? {
          severity: "critical",
          message: "RPC gateway is unreachable",
          steps: [
            `1. Verify IPPAN_RPC_BASE_URL is set correctly: ${rpcBase}`,
            "2. Check if the gateway is accessible from your deployment environment",
            "3. Verify there are no firewall/network restrictions",
            "4. Check if the gateway is running and healthy",
          ],
        }
      : !requiredOk
        ? {
            severity: "warning",
            message: "Some required RPC endpoints are not responding",
            steps: [
              "1. Check the 'probe_matrix' section for specific endpoint failures",
              "2. /blocks returning 404 is expected - fallback will be used",
              "3. Verify the node is fully synced and operational",
            ],
          }
        : null,

    explorer_capabilities: {
      transactions_list: txRecentProbe.ok,
      transaction_detail: txRecentProbe.endpoint_available,
      blocks_list: blocksListProbe.ok || txRecentProbe.ok, // fallback available
      block_detail: true, // always try
      status_dashboard: statusProbe.ok,
      network_peers: peersProbe.ok,
    },
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json",
    },
  });
}
