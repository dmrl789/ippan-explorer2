import HandleSearchForm from "@/components/forms/HandleSearchForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHandleRecord } from "@/lib/mockData";
import { formatTimestamp } from "@/lib/format";

interface HandlesPageProps {
  searchParams: { handle?: string; query?: string };
}

export default async function HandlesPage({ searchParams }: HandlesPageProps) {
  const handleQuery = searchParams.handle ?? searchParams.query;
  const record = handleQuery ? await getHandleRecord(handleQuery) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Handles" description="Resolve @handle.ipn registrations to their owning address" />

      <Card title="Lookup">
        <HandleSearchForm />
      </Card>

      {handleQuery && (
        <Card title={`Lookup result for ${handleQuery}`}>
          {record ? (
            <div className="space-y-2 text-sm text-slate-300">
              <p>Owner: {record.owner}</p>
              <p>Expiry: {formatTimestamp(record.expiresAt)}</p>
              <p>DHT: {record.dhtStatus}</p>
            </div>
          ) : (
            <p className="text-sm text-red-400">Handle not found in mock dataset.</p>
          )}
        </Card>
      )}
    </div>
  );
}
