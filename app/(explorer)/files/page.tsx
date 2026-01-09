// Force dynamic rendering - never use cached/stale data
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { Suspense } from "react";
import FilesClient from "@/components/files/FilesClient";

/**
 * Files Page
 * 
 * This page uses client-side fetching exclusively to avoid SSR/ISR cache issues.
 * All data is fetched from /api/rpc/ipndht/files which is proven to work.
 * 
 * Wrapped in Suspense because FilesClient uses useSearchParams().
 */
export default function FilesPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading files...</div>}>
      <FilesClient />
    </Suspense>
  );
}
