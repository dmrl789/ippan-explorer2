interface SourceBadgeProps {
  source: "live" | "error" | "loading";
  label?: string;
}

export function SourceBadge({ source, label }: SourceBadgeProps) {
  const styles =
    source === "live"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : source === "loading"
        ? "border-slate-500/40 bg-slate-500/10 text-slate-300"
        : "border-rose-500/40 bg-rose-500/10 text-rose-200";

  const defaultLabel = source === "live" ? "devnet" : source === "loading" ? "loading..." : "devnet error";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>
      {label ?? defaultLabel}
    </span>
  );
}
