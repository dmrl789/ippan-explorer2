"use client";

import Link from "next/link";
import SearchBar from "@/components/forms/SearchBar";

export default function TopNav() {
  const rpcBase = process.env.NEXT_PUBLIC_IPPAN_RPC_URL;

  return (
    <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 lg:px-8">
        <Link href="/" className="text-base font-semibold tracking-tight text-slate-100">
          IPPAN Explorer
        </Link>
        <div className="ml-auto w-full max-w-xl">
          <SearchBar />
          {rpcBase && (
            <div className="mt-1 text-[10px] text-slate-500">
              Connected to:{" "}
              <code className="break-all rounded bg-slate-900/60 px-1 py-0.5 text-slate-300">{rpcBase}</code>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
