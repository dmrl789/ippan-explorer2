interface SourceBadgeProps {
  source: "rpc" | "mock";
  label?: string;
}

export function SourceBadge({ source, label }: SourceBadgeProps) {
  const styles =
    source === "rpc"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
      : "border-amber-500/40 bg-amber-500/10 text-amber-200";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles}`}>
      {label ?? `Source: ${source === "rpc" ? "RPC" : "Mock"}`}
    </span>
  );
}
