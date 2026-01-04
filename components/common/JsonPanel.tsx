"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

interface JsonPanelProps {
  data: unknown;
  /** Title shown in header */
  title?: string;
  /** Start expanded */
  defaultExpanded?: boolean;
  /** Max height before scroll (in px) */
  maxHeight?: number;
}

/**
 * Collapsible JSON viewer with copy functionality.
 *
 * IMPORTANT: Must never crash rendering. Some RPC payloads may contain values
 * that `JSON.stringify` cannot handle (e.g. BigInt).
 */
export function JsonPanel({ 
  data, 
  title = "Raw JSON",
  defaultExpanded = false,
  maxHeight = 400,
}: JsonPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  const jsonString = safeStringify(data, 2);
  
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/60 border-b border-slate-800">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-100"
        >
          <svg 
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-90" : ""}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {title}
        </button>
        {expanded && (
          <CopyButton text={jsonString} label="Copy JSON" />
        )}
      </div>
      
      {expanded && (
        <div 
          className="overflow-auto p-4"
          style={{ maxHeight }}
        >
          <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">
            {jsonString}
          </pre>
        </div>
      )}
    </div>
  );
}

function safeStringify(value: unknown, space = 2): string {
  try {
    return JSON.stringify(
      value,
      (_key, v) => (typeof v === "bigint" ? v.toString() : v),
      space,
    );
  } catch {
    try {
      // Fall back to a shallow string tag; still must not throw.
      return `\"[unserializable: ${Object.prototype.toString.call(value)}]\"`;
    } catch {
      return "\"[unserializable]\"";
    }
  }
}
