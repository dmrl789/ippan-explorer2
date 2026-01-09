import { redirect } from "next/navigation";

interface BlockAliasPageProps {
  params: Promise<{ idOrHash: string }>;
}

export default async function BlockAliasPage({ params }: BlockAliasPageProps) {
  const { idOrHash } = await params;
  redirect(`/blocks/${encodeURIComponent(idOrHash)}`);
}

