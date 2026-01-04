export default function TechnologyPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Technology</h1>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <p className="text-white/75">
          IPPAN focuses on deterministic ordering, high parallelism, and verifiable execution.
        </p>
        <ul className="list-disc pl-5 text-white/75 space-y-2">
          <li><span className="font-semibold">HashTimer ordering</span> for deterministic, replayable chronology.</li>
          <li><span className="font-semibold">BlockDAG</span> structure to maximize concurrency.</li>
          <li><span className="font-semibold">Deterministic validator selection</span> and fairness mechanisms.</li>
        </ul>
      </div>
    </div>
  );
}
