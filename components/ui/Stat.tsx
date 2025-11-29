import type { ReactNode } from "react";

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: string;
}

export function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
