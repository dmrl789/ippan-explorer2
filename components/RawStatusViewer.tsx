"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import CopyButton from "@/components/common/CopyButton";

interface RawStatusViewerProps {
  /** The raw status data to display */
  data: unknown;
  /** Title for the card */
  title?: string;
  /** Description for the card */
  description?: string;
  /** Initial view mode */
  defaultView?: "collapsed" | "raw" | "all-fields";
}

type ViewMode = "collapsed" | "raw" | "all-fields";

interface FlattenedField {
  path: string;
  value: unknown;
  type: string;
}

/**
 * Flatten a nested object into an array of path-value pairs.
 * This ensures ALL fields are visible, including unknown/new ones.
 */
function flattenObject(
  obj: unknown,
  prefix = "",
  result: FlattenedField[] = []
): FlattenedField[] {
  if (obj === null) {
    result.push({ path: prefix || "(root)", value: null, type: "null" });
    return result;
  }

  if (obj === undefined) {
    result.push({ path: prefix || "(root)", value: undefined, type: "undefined" });
    return result;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      result.push({ path: prefix || "(root)", value: "[]", type: "array (empty)" });
    } else if (obj.length <= 5 && obj.every(item => typeof item !== "object" || item === null)) {
      // Small array of primitives - show inline
      result.push({ path: prefix || "(root)", value: obj, type: `array (${obj.length})` });
    } else {
      // Large or complex array - show summary and flatten items
      result.push({ path: prefix || "(root)", value: `[${obj.length} items]`, type: "array" });
      obj.forEach((item, index) => {
        const itemPath = prefix ? `${prefix}[${index}]` : `[${index}]`;
        if (typeof item === "object" && item !== null) {
          flattenObject(item, itemPath, result);
        } else {
          result.push({ path: itemPath, value: item, type: typeof item });
        }
      });
    }
    return result;
  }

  if (typeof obj === "object") {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (entries.length === 0) {
      result.push({ path: prefix || "(root)", value: "{}", type: "object (empty)" });
    } else {
      entries.forEach(([key, value]) => {
        const newPath = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          // Recurse into nested objects
          flattenObject(value, newPath, result);
        } else if (Array.isArray(value)) {
          flattenObject(value, newPath, result);
        } else {
          result.push({ path: newPath, value, type: typeof value });
        }
      });
    }
    return result;
  }

  // Primitive value at root
  result.push({ path: prefix || "(root)", value: obj, type: typeof obj });
  return result;
}

/**
 * Format a value for display in the All Fields view.
 */
function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") {
    // Truncate very long strings
    if (value.length > 200) {
      return `"${value.slice(0, 200)}…" (${value.length} chars)`;
    }
    return `"${value}"`;
  }
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value.toString();
  if (Array.isArray(value)) {
    // Small primitive arrays shown inline
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Get CSS class for value type.
 */
function getValueClass(type: string): string {
  switch (type) {
    case "string":
      return "text-emerald-300";
    case "number":
      return "text-blue-300";
    case "boolean":
      return "text-amber-300";
    case "null":
    case "undefined":
      return "text-slate-500";
    default:
      return "text-slate-300";
  }
}

/**
 * Enhanced viewer for raw RPC responses.
 * 
 * Features:
 * - Collapsible raw JSON view
 * - "All Fields" flattened view that shows every field path
 * - Search/filter in All Fields view
 * - Copy to clipboard
 * 
 * This ensures unknown/new fields are always visible without code changes.
 */
export function RawStatusViewer({
  data,
  title = "Raw Status",
  description = "Complete response from RPC",
  defaultView = "collapsed",
}: RawStatusViewerProps) {
  const [view, setView] = useState<ViewMode>(defaultView);
  const [searchTerm, setSearchTerm] = useState("");

  const jsonString = useMemo(() => {
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return "Error serializing data";
    }
  }, [data]);

  const flattenedFields = useMemo(() => {
    return flattenObject(data);
  }, [data]);

  const filteredFields = useMemo(() => {
    if (!searchTerm.trim()) return flattenedFields;
    const term = searchTerm.toLowerCase();
    return flattenedFields.filter(
      field =>
        field.path.toLowerCase().includes(term) ||
        formatValue(field.value).toLowerCase().includes(term)
    );
  }, [flattenedFields, searchTerm]);

  return (
    <Card title={title} description={description}>
      {/* View mode tabs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setView("collapsed")}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "collapsed"
              ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50"
              : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200"
          }`}
        >
          Collapsed
        </button>
        <button
          onClick={() => setView("raw")}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "raw"
              ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50"
              : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200"
          }`}
        >
          Raw JSON
        </button>
        <button
          onClick={() => setView("all-fields")}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            view === "all-fields"
              ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50"
              : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:text-slate-200"
          }`}
        >
          All Fields ({flattenedFields.length})
        </button>
        
        <div className="ml-auto">
          <CopyButton text={jsonString} label="Copy JSON" />
        </div>
      </div>

      {/* Collapsed view */}
      {view === "collapsed" && (
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 p-3">
          <p className="text-sm text-slate-400">
            {typeof data === "object" && data !== null
              ? `${Object.keys(data).length} top-level fields`
              : "No data"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Click &quot;Raw JSON&quot; or &quot;All Fields&quot; to expand
          </p>
        </div>
      )}

      {/* Raw JSON view */}
      {view === "raw" && (
        <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 overflow-hidden">
          <pre className="overflow-x-auto p-4 text-xs text-slate-300 max-h-[500px] overflow-y-auto">
            {jsonString}
          </pre>
        </div>
      )}

      {/* All Fields view */}
      {view === "all-fields" && (
        <div className="space-y-3">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search fields…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Fields count */}
          <p className="text-xs text-slate-500">
            Showing {filteredFields.length} of {flattenedFields.length} fields
            {searchTerm && ` matching "${searchTerm}"`}
          </p>

          {/* Fields list */}
          <div className="rounded-lg border border-slate-800/70 bg-slate-950/50 overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-900">
                <tr className="border-b border-slate-800">
                  <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wide">
                    Field Path
                  </th>
                  <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wide">
                    Value
                  </th>
                  <th className="px-3 py-2 text-left text-slate-500 uppercase tracking-wide w-20">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredFields.map((field, index) => (
                  <tr key={index} className="hover:bg-slate-900/50">
                    <td className="px-3 py-2 font-mono text-emerald-100 break-all">
                      {field.path}
                    </td>
                    <td className={`px-3 py-2 font-mono break-all ${getValueClass(field.type)}`}>
                      {formatValue(field.value)}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {field.type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredFields.length === 0 && (
              <div className="px-3 py-6 text-center text-slate-500">
                No fields match your search
              </div>
            )}
          </div>

          <p className="text-[10px] text-slate-500">
            All fields from the RPC response are shown here, including unknown/new fields.
            This view never hides data.
          </p>
        </div>
      )}
    </Card>
  );
}
