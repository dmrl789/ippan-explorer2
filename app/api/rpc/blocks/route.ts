import { NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const result = await proxyRpcRequest("/blocks", { timeout: 4000 });

  if (!result.ok) {
    // 404 means endpoint not implemented yet (expected for some DevNet phases)
    const status = result.status_code === 404 ? 404 : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
