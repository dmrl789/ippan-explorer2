import { type TxStatus, getStatusBadgeClass, getStatusLabel } from "@/lib/normalize";

interface StatusBadgeProps {
  status: TxStatus;
  /** Show full label or just first letter on mobile */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

/**
 * Transaction status badge with consistent styling.
 */
export function StatusBadge({ status, compact = false, className = "" }: StatusBadgeProps) {
  const colorClass = getStatusBadgeClass(status);
  const label = getStatusLabel(status);
  
  return (
    <span 
      className={`
        inline-flex items-center justify-center 
        rounded-full border px-2 py-0.5 
        text-[10px] font-semibold uppercase tracking-wide
        ${colorClass} ${className}
      `}
      title={label}
    >
      {compact ? label.charAt(0) : label}
    </span>
  );
}

/**
 * Status badge that shows compact on mobile, full on desktop.
 */
export function ResponsiveStatusBadge({ status, className = "" }: Omit<StatusBadgeProps, "compact">) {
  const colorClass = getStatusBadgeClass(status);
  const label = getStatusLabel(status);
  
  return (
    <span 
      className={`
        inline-flex items-center justify-center 
        rounded-full border px-2 py-0.5 
        text-[10px] font-semibold uppercase tracking-wide
        ${colorClass} ${className}
      `}
      title={label}
    >
      {/* Compact on mobile */}
      <span className="sm:hidden">{label.charAt(0)}</span>
      {/* Full on desktop */}
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
