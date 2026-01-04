"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  label?: string;
  /** Button size variant */
  size?: "xs" | "sm" | "md";
  /** Additional className */
  className?: string;
  /** Show icon only (no label) */
  iconOnly?: boolean;
}

export function CopyButton({ 
  text, 
  label = "Copy", 
  size = "md",
  className = "",
  iconOnly = false,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy", error);
    }
  };

  const sizeClasses = {
    xs: "px-1 py-0.5 text-[10px]",
    sm: "px-1.5 py-0.5 text-xs",
    md: "px-3 py-1.5 text-xs",
  };

  const iconSizes = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-2 w-2",
  };

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={handleCopy}
        className={`
          inline-flex items-center justify-center 
          text-slate-500 hover:text-emerald-400 
          transition-colors
          ${className}
        `}
        title={copied ? "Copied!" : `Copy: ${text.slice(0, 20)}${text.length > 20 ? "..." : ""}`}
      >
        {copied ? (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`
        inline-flex items-center gap-1.5 rounded-lg 
        border border-slate-800 bg-slate-950/80 
        font-medium text-slate-200 transition 
        hover:border-emerald-500/50 hover:text-emerald-200
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className={`rounded-full ${copied ? "bg-emerald-400" : "bg-slate-600"} ${iconSizes[size]}`} />
      {copied ? "Copied" : label}
    </button>
  );
}

// Keep default export for backwards compatibility
export default CopyButton;
