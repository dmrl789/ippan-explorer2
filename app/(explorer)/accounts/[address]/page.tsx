import Link from "next/link";
import { notFound } from "next/navigation";
import AccountPanel from "@/components/accounts/AccountPanel";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAccount, getPayments } from "@/lib/mockData";

interface AccountPageProps {
  params: { address: string };
}

export default async function AccountPage({ params }: AccountPageProps) {
  const [account, payments] = await Promise.all([getAccount(params.address), getPayments()]);

  if (!account) {
    notFound();
  }
  const resolvedAccount = account;

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
    </div>
  );
}
