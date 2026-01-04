export default function DevnetPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Devnet</h1>
      <p className="text-white/75">
        Public API gateways (edit this page anytime without touching deployment config).
      </p>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/60">Gateways</div>
        <ul className="mt-3 space-y-2 font-mono text-sm">
          <li>api1.ippan.uk</li>
          <li>api2.ippan.uk</li>
          <li>api3.eepen.uk</li>
          <li>api4.eepen.uk</li>
        </ul>
        <p className="mt-4 text-sm text-white/60">
          Example endpoints: <span className="font-mono">/status</span>, <span className="font-mono">/metrics</span>, <span className="font-mono">/health</span>
        </p>
      </div>
    </div>
  );
}
