import {
  getIpndhtSummary,
  getIpndhtFiles,
  getIpndhtHandles,
  type IpndhtSummaryData,
  type IpndhtFileRecord,
  type IpndhtHandleRecord,
} from "@/lib/serverFetch";
import IpndhtClient from "@/components/ipndht/IpndhtClient";

// Force Node.js runtime - Edge runtime cannot fetch plain http:// URLs reliably
export const runtime = "nodejs";
// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface IpndhtSSRData {
  summary: IpndhtSummaryData | null;
  files: IpndhtFileRecord[];
  handles: IpndhtHandleRecord[];
  summaryOk: boolean;
  filesOk: boolean;
  handlesOk: boolean;
  error?: string;
}

/**
 * IPNDHT Overview Page with SSR
 *
 * KEY FIX: This page now calls the server fetch helpers DIRECTLY instead of
 * relying solely on client-side fetching. This ensures content is visible
 * immediately on page load.
 */
export default async function IpndhtPage() {
  console.log("[IpndhtPage] SSR: calling server fetch helpers directly");

  let summaryData: IpndhtSummaryData | null = null;
  let filesData: IpndhtFileRecord[] = [];
  let handlesData: IpndhtHandleRecord[] = [];
  let summaryOk = false;
  let filesOk = false;
  let handlesOk = false;
  let ssrError: string | null = null;

  try {
    // Fetch all data in parallel
    const [summaryResult, filesResult, handlesResult] = await Promise.all([
      getIpndhtSummary(),
      getIpndhtFiles(10),
      getIpndhtHandles(10),
    ]);

    if (summaryResult.ok && summaryResult.data) {
      summaryData = summaryResult.data;
      summaryOk = true;
    }

    if (filesResult.ok && filesResult.data) {
      filesData = filesResult.data;
      filesOk = true;
    }

    if (handlesResult.ok && handlesResult.data) {
      handlesData = handlesResult.data;
      handlesOk = true;
    }

    // Only show error if all endpoints failed
    if (!summaryOk && !filesOk && !handlesOk) {
      ssrError =
        summaryResult.error ||
        filesResult.error ||
        handlesResult.error ||
        "Gateway RPC unavailable";
    }

    console.log(
      `[IpndhtPage] SSR: summary=${summaryOk}, files=${filesOk} (${filesData.length}), handles=${handlesOk} (${handlesData.length})`
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    ssrError = errorMessage;
    console.error("[IpndhtPage] SSR error:", err);
  }

  const initialData: IpndhtSSRData = {
    summary: summaryData,
    files: filesData,
    handles: handlesData,
    summaryOk,
    filesOk,
    handlesOk,
    error: ssrError ?? undefined,
  };

  return <IpndhtClient initial={initialData} />;
}
