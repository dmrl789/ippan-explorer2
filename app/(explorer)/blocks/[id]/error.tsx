"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Block detail page crashed:", error);
  }, [error]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4">
        <p className="text-sm font-semibold text-red-200">Block page failed to render</p>
        <p className="mt-1 text-xs text-slate-300">
          This is a defensive error boundary so the explorer never shows a blank 500.
        </p>
        {error?.digest && (
          <p className="mt-2 text-xs text-slate-400">
            Digest: <span className="font-mono">{error.digest}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => reset()}
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
        >
          Retry
        </button>
        <Link
          href="/blocks"
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:text-emerald-100"
        >
          Back to blocks
        </Link>
      </div>
    </div>
  );
}

