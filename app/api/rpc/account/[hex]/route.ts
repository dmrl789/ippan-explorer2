import { NextRequest, NextResponse } from "next/server";
import { proxyRpcRequest } from "@/lib/rpcProxy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { hex: string } }
) {
  const address = params.hex;
  
  if (!address) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_address",
        error_code: "MISSING_PARAM",
        detail: "Account address is required",
        rpc_base: "",
        path: "/accounts/[hex]",
        ts: Date.now(),
      },
      { status: 400 }
    );
  }

  const result = await proxyRpcRequest(`/accounts/${encodeURIComponent(address)}`, {
    timeout: 4000,
  });

  if (!result.ok) {
    // 404 is a valid response (account not found)
    const status = result.status_code === 404 ? 404 : 502;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 200 });
}
