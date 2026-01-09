// Force dynamic rendering - never use cached/stale data
export const dynamic = "force-dynamic";
export const revalidate = 0;

import DashboardClient from "@/components/dashboard/DashboardClient";

/**
 * Dashboard Page
 * 
 * This page uses client-side fetching exclusively to avoid SSR/ISR cache issues.
 * All data is fetched from /api/rpc/* proxy endpoints which are proven to work.
 * 
 * The DevnetStatus component inside DashboardClient also fetches client-side.
 */
export default function DashboardPage() {
  return <DashboardClient />;
}
