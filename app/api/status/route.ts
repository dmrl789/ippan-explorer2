import { NextResponse } from "next/server";
import { fetchStatus } from "@/lib/status";

export async function GET() {
  const status = await fetchStatus();
  return NextResponse.json(status);
}
