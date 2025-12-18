import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function AccountsLandingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Accounts" description="Jump to an address, handle, or browse featured entities" />
      <Card title="Getting started">
        <p className="text-sm text-slate-400">
          Use the global search bar to jump directly to an account by address or handle, or pick from recent entities below
          once live data is available.
        </p>
        <p className="text-sm text-slate-400">This explorer does not include demo accounts; it only shows devnet RPC data.</p>
      </Card>
    </div>
  );
}
