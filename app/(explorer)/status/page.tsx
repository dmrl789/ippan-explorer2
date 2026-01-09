import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { fetchStatusWithSource } from "@/lib/status";

export default async function StatusPage() {
  let statusData: unknown = null;
  let error: string | null = null;

  try {
    const result = await fetchStatusWithSource();
    if (result.ok) {
      statusData = result.status;
    } else {
      error = result.error ?? "Unknown error";
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Fetch failed";
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Status" description="Node status (minimal debug version)" />

      <Card title="Status Data">
        {error ? (
          <div className="text-red-400">
            <p>Error: {error}</p>
          </div>
        ) : statusData ? (
          <div className="text-sm text-slate-300">
            <pre className="overflow-auto max-h-96 bg-slate-900 p-4 rounded">
              {JSON.stringify(statusData, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-slate-400">No data</p>
        )}
      </Card>
    </div>
  );
}
