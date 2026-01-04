import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-3xl font-semibold leading-tight sm:text-5xl">
          Deterministic Intelligence for a Decentralised World
        </h1>
        <p className="mt-4 max-w-2xl text-white/75">
          IPPAN is a deterministic, high-throughput ledger designed for AI and
          machine-to-machine economies—anchored by HashTimer ordering and a BlockDAG architecture.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/technology"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Technology
          </Link>
          <Link
            href="/devnet"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white"
          >
            Devnet endpoints
          </Link>
          <a
            href="https://github.com/dmrl789/IPPAN"
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white"
          >
            Source code
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Deterministic Ordering", body: "HashTimer-based ordering so arrival order is irrelevant; ordering is verifiable." },
          { title: "BlockDAG Throughput", body: "Parallelism-first design for lanes/shards and fast round finality." },
          { title: "Auditability", body: "Determinism + explicit ordering primitives to support compliance and replay." },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-lg font-semibold">{c.title}</div>
            <p className="mt-2 text-sm text-white/70">{c.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
