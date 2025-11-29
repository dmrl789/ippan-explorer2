interface StatusPillProps {
  status: "ok" | "warn" | "error";
}

export function StatusPill({ status }: StatusPillProps) {
  const styles =
    status === "ok"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
      : status === "warn"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/40"
      : "bg-red-500/10 text-red-400 border-red-500/40";

  const label = status === "ok" ? "healthy" : status === "warn" ? "degraded" : "error";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
