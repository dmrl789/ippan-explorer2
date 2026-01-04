import { redirect } from "next/navigation";

interface AccountAliasPageProps {
  params: Promise<{ addr: string }>;
}

export default async function AccountAliasPage({ params }: AccountAliasPageProps) {
  const { addr } = await params;
  redirect(`/accounts/${encodeURIComponent(addr)}`);
}

