import {
  getStatus,
  getIpndhtSummary,
  type StatusData,
  type IpndhtSummaryData,
} from "@/lib/serverFetch";
import L2Client from "@/components/l2/L2Client";

// Force Node.js runtime - Edge runtime cannot fetch plain http:// URLs reliably
export const runtime = "nodejs";
// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface L2SSRData {
  status: StatusData | null;
  ipndht: IpndhtSummaryData | null;
  statusOk: boolean;
  ipndhtOk: boolean;
}

/**
 * L2 Modules Page with SSR
 *
 * KEY FIX: This page now calls the server fetch helpers DIRECTLY instead of
 * relying solely on client-side fetching. This ensures content is visible
 * immediately on page load.
 */
export default async function L2Page() {
  console.log("[L2Page] SSR: calling server fetch helpers directly");

  let statusData: StatusData | null = null;
  let ipndhtData: IpndhtSummaryData | null = null;
  let statusOk = false;
  let ipndhtOk = false;

  try {
    // Fetch all data in parallel
    const [statusResult, ipndhtResult] = await Promise.all([
      getStatus(),
      getIpndhtSummary(),
    ]);

    if (statusResult.ok && statusResult.data) {
      statusData = statusResult.data;
      statusOk = true;
    }

    if (ipndhtResult.ok && ipndhtResult.data) {
      ipndhtData = ipndhtResult.data;
      ipndhtOk = true;
    }

    console.log(`[L2Page] SSR: status=${statusOk}, ipndht=${ipndhtOk}`);
  } catch (err: unknown) {
    console.error("[L2Page] SSR error:", err);
  }

  const initialData: L2SSRData = {
    status: statusData,
    ipndht: ipndhtData,
    statusOk,
    ipndhtOk,
  };

  return <L2Client initial={initialData} />;
}
