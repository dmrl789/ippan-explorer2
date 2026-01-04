import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { resolveSearch } from "@/lib/search";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";

  if (!query.trim()) {
    redirect("/");
  }

  const result = await resolveSearch(query);
  if (result.kind === "redirect") {
    redirect(result.to);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Search" description={`No match for: ${result.normalized || query}`} />
      <Card title="Not found">
        <div className="space-y-3 text-sm text-slate-300">
          <p>
            We couldn&apos;t resolve this input to a block, transaction, account, handle, or HashTimer on the connected devnet.
          </p>
          <div className="text-xs text-slate-500">
            <p className="font-semibold text-slate-400">Try:</p>
            <ul className="mt-1 list-disc ml-5 space-y-1">
              <li><code className="bg-slate-900/60 px-1 rounded">0x…</code> for accounts</li>
              <li><code className="bg-slate-900/60 px-1 rounded">@name.ipn</code> for handles</li>
              <li><code className="bg-slate-900/60 px-1 rounded">#123</code> for rounds/heights</li>
              <li><code className="bg-slate-900/60 px-1 rounded">64-hex</code> for tx/block/hashtimer</li>
            </ul>
          </div>
          <div className="pt-2">
            <Link href="/" className="text-emerald-300 underline-offset-4 hover:underline">
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

