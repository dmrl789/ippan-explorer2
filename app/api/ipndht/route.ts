import { NextResponse } from "next/server";
import { fetchIpndht } from "@/lib/ipndht";

export async function GET() {
  const data = await fetchIpndht();
  return NextResponse.json(data);
}
