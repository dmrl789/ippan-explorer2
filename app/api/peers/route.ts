import { NextResponse } from "next/server";
import { fetchPeers } from "@/lib/peers";

export async function GET() {
  const peers = await fetchPeers();
  return NextResponse.json(peers);
}
