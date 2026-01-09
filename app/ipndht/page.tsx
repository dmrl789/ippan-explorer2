// Force dynamic rendering - never use cached/stale data
export const dynamic = "force-dynamic";
export const revalidate = 0;

import IpndhtClient from "@/components/ipndht/IpndhtClient";

/**
 * IPNDHT Overview Page
 * 
 * This page uses client-side fetching exclusively to avoid SSR/ISR cache issues.
 * All data is fetched from /api/rpc/* proxy endpoints which are proven to work.
 * 
 * The previous SSR approach was showing stale "endpoint not exposed" errors
 * even though the proxy endpoints returned 200 OK.
 */
export default function IpndhtPage() {
  return <IpndhtClient />;
}
