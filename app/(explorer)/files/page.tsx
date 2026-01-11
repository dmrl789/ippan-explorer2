import { Suspense } from "react";
import { getIpndhtFiles, type IpndhtFileRecord } from "@/lib/serverFetch";
import FilesClient from "@/components/files/FilesClient";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";

// Force Node.js runtime - Edge runtime cannot fetch plain http:// URLs reliably
export const runtime = "nodejs";
// Force dynamic rendering - no caching
export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface FilesSSRData {
  files: IpndhtFileRecord[];
  ok: boolean;
  error?: string;
}

/**
 * SSR File List - Renders files directly in server HTML.
 */
function SSRFileList({ files }: { files: IpndhtFileRecord[] }) {
  if (!files || files.length === 0) {
    return (
      <noscript>
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-4 text-sm text-slate-400">
          No files available (SSR). Enable JavaScript for full functionality.
        </div>
      </noscript>
    );
  }

  return (
    <noscript>
      <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-slate-800/50">
          <span className="text-sm font-semibold text-slate-100">Published Files (SSR)</span>
          <span className="text-xs text-slate-500">{files.length} files</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr className="border-b border-slate-800">
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">File ID</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Owner</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">MIME</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wide text-slate-500">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {files.slice(0, 20).map((file) => (
                <tr key={file.id} className="hover:bg-slate-900/30">
                  <td className="px-4 py-2">
                    <Link
                      href={`/files/${file.id}`}
                      className="font-mono text-xs text-emerald-300 hover:text-emerald-200"
                    >
                      {file.id.length > 20 ? `${file.id.slice(0, 10)}…${file.id.slice(-10)}` : file.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-400 text-xs font-mono">
                    {file.owner ? (file.owner.length > 16 ? `${file.owner.slice(0, 8)}…${file.owner.slice(-8)}` : file.owner) : "—"}
                  </td>
                  <td className="px-4 py-2 text-slate-400 text-xs">{file.mime_type ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs">
                    {typeof file.size_bytes === "number" ? `${file.size_bytes.toLocaleString()} B` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-800/50 text-xs text-slate-500">
          Enable JavaScript for search and full functionality.
        </div>
      </div>
    </noscript>
  );
}

/**
 * Files Page with SSR
 *
 * This page uses client-side fetching for interactivity but provides
 * SSR initial data to avoid blank page on first load.
 *
 * Wrapped in Suspense because FilesClient uses useSearchParams().
 */
export default async function FilesPage() {
  console.log("[FilesPage] SSR: calling getIpndhtFiles directly (no HTTP self-fetch)");

  let initialFiles: IpndhtFileRecord[] = [];
  let ssrOk = false;
  let ssrError: string | null = null;

  try {
    const result = await getIpndhtFiles(100);

    if (result.ok && result.data) {
      initialFiles = result.data;
      ssrOk = true;
      console.log(`[FilesPage] SSR: got ${initialFiles.length} files`);
    } else {
      ssrError = result.error ?? "Failed to fetch files";
      console.log(`[FilesPage] SSR: error - ${ssrError}`);
    }
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    ssrError = errorMessage;
    console.error("[FilesPage] SSR error:", err);
  }

  const initialData: FilesSSRData = {
    files: initialFiles,
    ok: ssrOk,
    error: ssrError ?? undefined,
  };

  return (
    <div className="space-y-6">
      {/* SSR debug info */}
      <div className="text-xs text-slate-600 font-mono">
        SSR: {ssrOk ? `${initialFiles.length} files` : "no initial data"}
        {ssrError ? ` [error: ${ssrError}]` : ""}
      </div>

      {/* SSR error display */}
      {ssrError && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-3 text-sm">
          <div className="font-semibold text-amber-300">SSR Notice</div>
          <div className="text-amber-400/80 text-xs mt-1">{ssrError}</div>
          <p className="mt-1 text-xs text-slate-500">
            Client-side fetch will attempt to load data.
          </p>
        </div>
      )}

      {/* SSR fallback for no-JS environments */}
      <SSRFileList files={initialFiles} />

      {/* Client component for interactive features */}
      <Suspense fallback={<div className="p-6">Loading files...</div>}>
        <FilesClient initial={initialData} />
      </Suspense>
    </div>
  );
}
