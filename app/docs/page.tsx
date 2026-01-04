export default function DocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Docs</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <p className="text-white/75">
          Add links here: whitepaper, explorer, API reference, node setup.
        </p>
        <ul className="mt-4 list-disc pl-5 text-white/75 space-y-2">
          <li>Whitepaper (link)</li>
          <li>Explorer (link)</li>
          <li>API Reference (link)</li>
          <li>Run a node (link)</li>
        </ul>
      </div>
    </div>
  );
}
