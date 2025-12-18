import { NextResponse } from "next/server";

const RPC_BASE_URL = process.env.NEXT_PUBLIC_IPPAN_RPC_URL ?? null;

export async function GET() {
  if (!RPC_BASE_URL) {
    return NextResponse.json(
      {
        ok: false,
        base: null,
        error: "NEXT_PUBLIC_IPPAN_RPC_URL is not set in this build",
      },
      { status: 200 },
    );
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${RPC_BASE_URL}/status`, {
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
        base: RPC_BASE_URL,
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
        base: RPC_BASE_URL,
        error: String(err),
      },
      { status: 200 },
    );
  }
}
