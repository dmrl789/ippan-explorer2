import {
  getStatus,
  getIpndhtSummary,
  getPeers,
  type StatusData,
  type IpndhtSummaryData,
  type NormalizedPeer,
} from "@/lib/serverFetch";
import DashboardClient from "@/components/dashboard/DashboardClient";

// Force Node.js runtime - Edge runtime cannot fetch plain http:// URLs reliably
export const runtime = "nodejs";
// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface DashboardSSRData {
  status: StatusData | null;
  ipndht: IpndhtSummaryData | null;
  peers: NormalizedPeer[];
  rpcBase: string;
  statusOk: boolean;
  ipndhtOk: boolean;
  peersOk: boolean;
}

/**
 * Dashboard Page with SSR
 *
 * KEY FIX: This page now calls the server fetch helpers DIRECTLY instead of
 * relying solely on client-side fetching. This ensures content is visible
 * immediately on page load.
 */
export default async function DashboardPage() {
  console.log("[DashboardPage] SSR: calling server fetch helpers directly");

  let statusData: StatusData | null = null;
  let ipndhtData: IpndhtSummaryData | null = null;
  let peersData: NormalizedPeer[] = [];
  let rpcBase = "";
  let statusOk = false;
  let ipndhtOk = false;
  let peersOk = false;

  try {
    // Fetch all data in parallel
    const [statusResult, ipndhtResult, peersResult] = await Promise.all([
      getStatus(),
      getIpndhtSummary(),
      getPeers(),
    ]);

    if (statusResult.ok && statusResult.data) {
      statusData = statusResult.data;
      statusOk = true;
      rpcBase = statusResult.rpcBase;
    }

    if (ipndhtResult.ok && ipndhtResult.data) {
      ipndhtData = ipndhtResult.data;
      ipndhtOk = true;
    }

    if (peersResult.ok && peersResult.data) {
      peersData = peersResult.data;
      peersOk = true;
    }

    console.log(
      `[DashboardPage] SSR: status=${statusOk}, ipndht=${ipndhtOk}, peers=${peersOk}, rpcBase=${rpcBase}`
    );
  } catch (err: unknown) {
    console.error("[DashboardPage] SSR error:", err);
  }

  const initialData: DashboardSSRData = {
    status: statusData,
    ipndht: ipndhtData,
    peers: peersData,
    rpcBase,
    statusOk,
    ipndhtOk,
    peersOk,
  };

  return <DashboardClient initial={initialData} />;
}
