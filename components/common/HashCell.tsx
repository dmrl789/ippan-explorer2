"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

interface HashCellProps {
  value: string;
  /** Number of characters to show at start and end. Default: 6 */
  chars?: number;
  /** Show full hash in tooltip on hover */
  showTooltip?: boolean;
  /** Optional link href */
  href?: string;
  /** Additional className */
  className?: string;
  /** Use monospace font */
  mono?: boolean;
}

/**
 * Responsive hash display with copy button.
 * Shows shortened hash on mobile, longer on desktop.
 */
export function HashCell({ 
  value, 
  chars = 6, 
  showTooltip = true,
  href,
  className = "",
  mono = true,
}: HashCellProps) {
  const [showFull, setShowFull] = useState(false);
  
  if (!value) {
    return <span className="text-slate-500">—</span>;
  }
  
  const shortened = value.length > chars * 2 + 3
    ? `${value.slice(0, chars)}…${value.slice(-chars)}`
    : value;
  
  const displayValue = showFull ? value : shortened;
  
  const baseClass = `${mono ? "font-mono" : ""} ${className}`.trim();
  
  const content = (
    <span 
      className={`group inline-flex items-center gap-1.5 ${baseClass}`}
      title={showTooltip ? value : undefined}
    >
      {href ? (
        <a 
          href={href} 
          className="text-emerald-300 hover:text-emerald-200 hover:underline underline-offset-2"
        >
          {displayValue}
        </a>
      ) : (
        <span className="text-slate-200 break-all">{displayValue}</span>
      )}
      <CopyButton 
        text={value} 
        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        size="sm"
      />
      {value.length > chars * 2 + 3 && (
        <button
          onClick={() => setShowFull(!showFull)}
          className="text-slate-500 hover:text-slate-300 text-[10px] shrink-0"
          title={showFull ? "Show shortened" : "Show full"}
        >
          {showFull ? "−" : "+"}
        </button>
      )}
    </span>
  );
  
  return content;
}

/**
 * Compact hash for mobile views - just shows last N chars + copy
 */
export function HashCellCompact({ 
  value, 
  chars = 8,
  href,
  className = "",
}: Omit<HashCellProps, "showTooltip" | "mono">) {
  if (!value) {
    return <span className="text-slate-500">—</span>;
  }
  
  const display = value.length > chars ? `…${value.slice(-chars)}` : value;
  
  return (
    <span className={`group inline-flex items-center gap-1 font-mono text-xs ${className}`}>
      {href ? (
        <a href={href} className="text-emerald-300 hover:underline">
          {display}
        </a>
      ) : (
        <span className="text-slate-300">{display}</span>
      )}
      <CopyButton text={value} size="xs" className="opacity-0 group-hover:opacity-100" />
    </span>
  );
}
