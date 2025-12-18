import { NextResponse } from "next/server";
import { getEnvRpcBaseUrl } from "@/lib/rpc";

export async function GET() {
  const rpcBase = getEnvRpcBaseUrl();

  if (!rpcBase) {
    return NextResponse.json(
      {
        ok: false,
        base: null,
        error: "NEXT_PUBLIC_IPPAN_RPC_URL or IPPAN_RPC_URL is not set in this build",
      },
      { status: 200 },
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${rpcBase}/status`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    let body: any = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    return NextResponse.json(
      {
        ok: res.ok,
        base: rpcBase,
        statusCode: res.status,
        statusText: res.statusText,
        keys: body ? Object.keys(body) : null,
      },
      { status: 200 },
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        base: rpcBase,
        error: String(err),
      },
      { status: 200 },
    );
  }
}
