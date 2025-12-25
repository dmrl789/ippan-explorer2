import { NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const result = await proxyRpcRequest("/health", { timeout: 4000 });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result, { status: 200 });
}
