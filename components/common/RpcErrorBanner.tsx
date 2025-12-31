"use client";

import { useState } from "react";

export interface RpcErrorInfo {
  error: string;
  errorCode?: string;
  rpcBase?: string;
  path?: string;
  statusCode?: number;
  lastSuccessTs?: number;
  consecutiveFailures?: number;
}

interface RpcErrorBannerProps {
  error: RpcErrorInfo;
  context: string; // e.g., "Blocks", "Transaction", "Account"
  showDebugLink?: boolean;
}

/**
 * Standard error banner for RPC failures.
 * Shows detailed diagnostics to help users understand and fix issues.
 */
export function RpcErrorBanner({ error, context, showDebugLink = true }: RpcErrorBannerProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getErrorTitle = () => {
    switch (error.errorCode) {
      case "gateway_unreachable":
      case "rpc_unreachable":
      case "NETWORK_ERROR":
        return "Gateway Unreachable";
      case "rpc_timeout":
      case "TIMEOUT":
        return "Gateway Timeout";
      case "endpoint_not_available":
        return "Endpoint Not Available";
      case "HTTP_404":
        return "Endpoint Not Found (404)";
      case "HTTP_500":
      case "HTTP_502":
      case "HTTP_503":
        return "Gateway Error";
      default:
        return "RPC Error";
    }
  };

  const getErrorDescription = () => {
    switch (error.errorCode) {
      case "gateway_unreachable":
      case "rpc_unreachable":
      case "NETWORK_ERROR":
        return "The Explorer cannot reach the IPPAN RPC gateway. This may indicate network issues or the gateway is temporarily down.";
      case "rpc_timeout":
      case "TIMEOUT":
        return "The request to the RPC gateway timed out. The gateway may be overloaded or experiencing issues.";
      case "endpoint_not_available":
        return `The ${context} endpoint is not yet available on this DevNet. This is expected during early development phases.`;
      case "HTTP_404":
        return `The ${context} endpoint returned 404. The endpoint may not be implemented on this DevNet version.`;
      case "HTTP_500":
      case "HTTP_502":
      case "HTTP_503":
        return "The RPC gateway returned an error. The node may be experiencing issues or restarting.";
      default:
        return error.error || "An unexpected error occurred while fetching data from the RPC gateway.";
    }
  };

  const isEndpointMissing = error.errorCode === "endpoint_not_available" || error.errorCode === "HTTP_404";

  return (
    <div className={`rounded-lg border p-4 ${
      isEndpointMissing 
        ? "border-amber-900/50 bg-amber-950/30" 
        : "border-red-900/50 bg-red-950/30"
    }`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold ${
              isEndpointMissing ? "text-amber-200" : "text-red-200"
            }`}>
              {getErrorTitle()}
            </span>
            {error.errorCode && (
              <span className="rounded bg-slate-800/70 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
                {error.errorCode}
              </span>
            )}
          </div>
          <p className={`text-sm ${isEndpointMissing ? "text-amber-200/80" : "text-red-200/80"}`}>
            {getErrorDescription()}
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {showDebugLink && (
          <a
            href="/api/rpc/debug"
            target="_blank"
            rel="noreferrer"
            className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1 text-slate-300 hover:border-slate-600 hover:text-slate-100"
          >
            Open Debug Panel
          </a>
        )}
        <a
          href="/api/rpc/status"
          target="_blank"
          rel="noreferrer"
          className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1 text-slate-300 hover:border-slate-600 hover:text-slate-100"
        >
          View /status JSON
        </a>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="rounded border border-slate-700 bg-slate-900/50 px-2 py-1 text-slate-300 hover:border-slate-600 hover:text-slate-100"
        >
          {showDetails ? "Hide Details" : "Show Details"}
        </button>
      </div>

      {/* Detailed diagnostics */}
      {showDetails && (
        <div className="mt-3 rounded border border-slate-800 bg-slate-950/50 p-3 text-xs">
          <div className="grid gap-2 sm:grid-cols-2">
            {error.rpcBase && (
              <div>
                <span className="text-slate-500">RPC Base:</span>
                <code className="ml-1 break-all text-slate-300">{error.rpcBase}</code>
              </div>
            )}
            {error.path && (
              <div>
                <span className="text-slate-500">Path:</span>
                <code className="ml-1 text-slate-300">{error.path}</code>
              </div>
            )}
            {error.statusCode !== undefined && (
              <div>
                <span className="text-slate-500">HTTP Status:</span>
                <span className="ml-1 text-slate-300">{error.statusCode}</span>
              </div>
            )}
            {error.lastSuccessTs !== undefined && (
              <div>
                <span className="text-slate-500">Last Success:</span>
                <span className="ml-1 text-slate-300">
                  {error.lastSuccessTs > 0 
                    ? new Date(error.lastSuccessTs).toLocaleTimeString()
                    : "Never"}
                </span>
              </div>
            )}
            {error.consecutiveFailures !== undefined && error.consecutiveFailures > 0 && (
              <div>
                <span className="text-slate-500">Consecutive Failures:</span>
                <span className="ml-1 text-slate-300">{error.consecutiveFailures}</span>
              </div>
            )}
          </div>
          
          {/* Troubleshooting tips */}
          <div className="mt-3 border-t border-slate-800 pt-2">
            <p className="text-slate-500 mb-1">Troubleshooting:</p>
            <ul className="list-disc list-inside text-slate-400 space-y-0.5">
              {!isEndpointMissing && (
                <>
                  <li>Check if the RPC gateway is accessible from your network</li>
                  <li>Verify IPPAN_RPC_BASE_URL environment variable is correct</li>
                  <li>The gateway may be temporarily unavailable - try again in a moment</li>
                </>
              )}
              {isEndpointMissing && (
                <>
                  <li>This endpoint may not be implemented in the current DevNet version</li>
                  <li>The gateway is online but doesn&apos;t expose this endpoint yet</li>
                  <li>This is expected behavior during early development phases</li>
                </>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Lightweight inline error indicator for cards/lists.
 */
export function RpcErrorIndicator({ error, context }: { error: string; context: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-red-300/80">
      <span className="h-2 w-2 rounded-full bg-red-500" />
      <span>{context}: {error}</span>
    </div>
  );
}
