/**
 * Catch-all RPC proxy route.
 * 
 * Forwards requests to the configured IPPAN RPC gateway with:
 * - Path allowlist for security (prevents SSRF)
 * - Configurable timeout
 * - Structured error responses
 * - Cache-Control headers for devnet UI
 * 
 * Usage: GET /api/rpc/some/path → proxies to ${IPPAN_RPC_BASE_URL}/some/path
 */
import { NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Allowlist of RPC paths that can be proxied.
 * This prevents SSRF attacks by only allowing known endpoints.
 * 
 * Patterns support:
 * - Exact matches: "/status"
 * - Prefix matches: "/blocks" (matches /blocks, /blocks/123, etc.)
 * - Dynamic segments: "/accounts/*" (matches /accounts/0x123)
 */
const ALLOWED_PATH_PREFIXES = [
  "/status",
  "/health",
  "/blocks",
  "/block",
  "/tx",
  "/round",
  "/rounds",
  "/accounts",
  "/account",
  "/handles",
  "/handle",
  "/files",
  "/file",
  "/ipndht",
  "/peers",
  "/peer",
  "/l2",
  "/ai",
  "/hashtimers",
  "/hashtimer",
  "/debug",
  "/consensus",
  "/network",
  "/metrics",
];

function isAllowedPath(path: string): boolean {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const lowerPath = normalizedPath.toLowerCase();
  
  return ALLOWED_PATH_PREFIXES.some(prefix => {
    const lowerPrefix = prefix.toLowerCase();
    return lowerPath === lowerPrefix || lowerPath.startsWith(`${lowerPrefix}/`);
  });
}

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const params = await context.params;
  const pathSegments = params.path;
  
  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_path",
        error_code: "MISSING_PATH",
        detail: "No RPC path specified",
      },
      { status: 400 }
    );
  }

  const rpcPath = `/${pathSegments.join("/")}`;
  
  // Security: Only allow known RPC paths
  if (!isAllowedPath(rpcPath)) {
    return NextResponse.json(
      {
        ok: false,
        error: "path_not_allowed",
        error_code: "PATH_NOT_ALLOWED",
        detail: `Path "${rpcPath}" is not in the allowlist`,
        path: rpcPath,
      },
      { status: 403 }
    );
  }

  // Forward query parameters
  const url = new URL(request.url);
  const queryString = url.search;
  const fullPath = queryString ? `${rpcPath}${queryString}` : rpcPath;

  // Proxy the request with a 5-second timeout
  const result = await proxyRpcRequest(fullPath, { timeout: 5000 });

  // Set appropriate status code based on result
  const statusCode = result.ok 
    ? 200 
    : result.status_code === 404 
      ? 404 
      : result.status_code && result.status_code >= 500 
        ? 502 
        : 502;

  // Return with Cache-Control for devnet (no caching)
  return NextResponse.json(result, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-RPC-Proxy": "ippan-explorer",
      "X-RPC-Path": rpcPath,
    },
  });
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  const params = await context.params;
  const pathSegments = params.path;
  
  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_path",
        error_code: "MISSING_PATH",
        detail: "No RPC path specified",
      },
      { status: 400 }
    );
  }

  const rpcPath = `/${pathSegments.join("/")}`;
  
  if (!isAllowedPath(rpcPath)) {
    return NextResponse.json(
      {
        ok: false,
        error: "path_not_allowed",
        error_code: "PATH_NOT_ALLOWED",
        detail: `Path "${rpcPath}" is not in the allowlist`,
        path: rpcPath,
      },
      { status: 403 }
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  const result = await proxyRpcRequest(rpcPath, { 
    timeout: 5000, 
    method: "POST",
    body,
  });

  const statusCode = result.ok 
    ? 200 
    : result.status_code === 404 
      ? 404 
      : 502;

  return NextResponse.json(result, {
    status: statusCode,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-RPC-Proxy": "ippan-explorer",
      "X-RPC-Path": rpcPath,
    },
  });
}
