import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeader title="Block" description="Loading…" />
      <Card title="Block Header">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800/60" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800/60" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800/60" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-slate-800/60" />
        </div>
      </Card>
      <Card title="Transactions in Block">
        <div className="h-24 w-full animate-pulse rounded bg-slate-800/40" />
      </Card>
    </div>
  );
}

