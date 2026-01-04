"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SearchBar from "@/components/forms/SearchBar";
import { IPPAN_RPC_BASE } from "@/lib/rpc";

interface GatewayStatus {
  ok: boolean;
  latency_ms?: number;
  error?: string;
}

export default function TopNav() {
  const rpcBase = IPPAN_RPC_BASE;
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Check gateway health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const start = Date.now();
        const res = await fetch("/api/rpc/health", { 
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        });
        const latency_ms = Date.now() - start;
        const data = await res.json();
        
        setGatewayStatus({
          ok: data.ok || res.ok,
          latency_ms,
        });
      } catch (err) {
        setGatewayStatus({
          ok: false,
          error: err instanceof Error ? err.message : "Connection failed",
        });
      }
    }
    
    checkHealth();
    // Re-check every 30s
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = gatewayStatus === null 
    ? "bg-slate-500" 
    : gatewayStatus.ok 
      ? "bg-emerald-500" 
      : "bg-red-500";

  return (
    <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 lg:px-8">
        {/* Logo */}
        <Link href="/" className="text-base font-semibold tracking-tight text-slate-100 shrink-0">
          <span className="hidden sm:inline">IPPAN Explorer</span>
          <span className="sm:hidden">IPPAN</span>
        </Link>
        
        {/* Search bar - hidden on very small screens */}
        <div className="flex-1 max-w-xl hidden xs:block">
          <SearchBar />
        </div>
        
        {/* Spacer for mobile */}
        <div className="flex-1 xs:hidden" />
        
        {/* Gateway status indicator */}
        <div className="relative">
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1.5 text-xs hover:border-slate-700"
          >
            <span className={`h-2 w-2 rounded-full ${statusColor} ${gatewayStatus === null ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline text-slate-400">
              {gatewayStatus === null 
                ? "Checking..." 
                : gatewayStatus.ok 
                  ? `DevNet ${gatewayStatus.latency_ms ? `(${gatewayStatus.latency_ms}ms)` : ""}` 
                  : "Disconnected"}
            </span>
          </button>
          
          {/* Diagnostics dropdown */}
          {showDiagnostics && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-slate-800 bg-slate-900 p-4 shadow-xl z-50">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">RPC Gateway</p>
                  <code className="text-xs text-slate-300 break-all">{rpcBase}</code>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${statusColor}`} />
                    <span className="text-sm text-slate-200">
                      {gatewayStatus === null 
                        ? "Checking..." 
                        : gatewayStatus.ok 
                          ? "Connected" 
                          : gatewayStatus.error || "Disconnected"}
                    </span>
                  </div>
                </div>
                {gatewayStatus?.latency_ms && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Latency</p>
                    <span className="text-sm text-slate-200">{gatewayStatus.latency_ms}ms</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-800 space-y-2">
                  <a
                    href="/api/rpc/debug"
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full rounded bg-slate-800 px-3 py-1.5 text-center text-xs text-slate-200 hover:bg-slate-700"
                  >
                    View Full Diagnostics
                  </a>
                  <a
                    href="/api/rpc/status"
                    target="_blank"
                    rel="noreferrer"
                    className="block w-full rounded bg-slate-800 px-3 py-1.5 text-center text-xs text-slate-200 hover:bg-slate-700"
                  >
                    View /status JSON
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile search bar */}
      <div className="xs:hidden px-4 pb-3">
        <SearchBar />
      </div>
    </header>
  );
}
