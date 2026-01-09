import { redirect } from "next/navigation";

function normalizeHex(value: string): string {
  const trimmed = value.trim();
  const withoutPrefix = trimmed.replace(/^HT-/i, "").replace(/^0x/i, "");
  return withoutPrefix.toLowerCase();
}

interface HashTimerAliasPageProps {
  params: Promise<{ hex: string }>;
}

export default async function HashTimerAliasPage({ params }: HashTimerAliasPageProps) {
  const { hex } = await params;
  redirect(`/hashtimers/${encodeURIComponent(normalizeHex(hex))}`);
}

