import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import AccountPanel from "@/components/accounts/AccountPanel";
import { SourceBadge } from "@/components/common/SourceBadge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAccount, getPayments } from "@/lib/mockData";
import { fetchIpndhtFiles } from "@/lib/files";

interface AccountPageProps {
  params: { address: string };
}

export default async function AccountPage({ params }: AccountPageProps) {
  const [account, payments, ipndhtFiles] = await Promise.all([getAccount(params.address), getPayments(), fetchIpndhtFiles()]);

  if (!account) {
    notFound();
  }
  const resolvedAccount = account;
  const owned = ipndhtFiles.files.filter((file) => (file.owner ?? "").toLowerCase() === resolvedAccount.address.toLowerCase());
  const aiOwned = owned.filter((file) => {
    const doctype = typeof file.meta?.doctype === "string" ? file.meta.doctype.toLowerCase() : "";
    return ["ai_model", "ai_dataset", "ai_report"].includes(doctype);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description={resolvedAccount.address}
        actions={
          <Link href="/accounts" className="text-sm text-slate-400 hover:text-slate-100">
            ← Back to accounts
          </Link>
        }
      />
      <Card title="Account overview">
        <AccountPanel account={resolvedAccount} payments={payments} />
      </Card>

      <Card
        title="L2 Footprint"
        description="AI/L2 surfaces inferred from this account’s IPNDHT descriptors (no invented state)"
        headerSlot={<SourceBadge source={ipndhtFiles.source} />}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="IPNDHT files owned" value={owned.length.toLocaleString()} />
          <Detail label="AI-related files owned" value={aiOwned.length.toLocaleString()} />
          <Detail
            label="View"
            value={
              <Link
                href={`/files?owner=${encodeURIComponent(resolvedAccount.address)}&tag=ai`}
                className="text-emerald-300 underline-offset-4 hover:underline"
              >
                View AI-related files for this account
              </Link>
            }
          />
        </div>
        {ipndhtFiles.source === "mock" && (
          <p className="mt-3 text-xs text-amber-200">
            Mock mode: counts are based on demo descriptors and will differ from live RPC.
          </p>
        )}
      </Card>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="text-sm font-semibold text-slate-100">{value}</div>
    </div>
  );
}
