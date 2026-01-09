// Force dynamic rendering - never use cached/stale data
export const dynamic = "force-dynamic";
export const revalidate = 0;

import L2Client from "@/components/l2/L2Client";

/**
 * L2 Modules Page
 * 
 * This page uses client-side fetching exclusively to avoid SSR/ISR cache issues.
 * All data is fetched from /api/rpc/* proxy endpoints which are proven to work.
 */
export default function L2Page() {
  return <L2Client />;
}
