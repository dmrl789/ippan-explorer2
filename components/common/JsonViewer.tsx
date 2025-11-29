"use client";

import { useState } from "react";

interface JsonViewerProps {
  data: unknown;
}

export default function JsonViewer({ data }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl bg-slate-950/40 p-4 text-slate-100">
      <button
        className="mb-2 text-sm font-semibold text-emerald-300 underline"
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded ? "Hide raw JSON" : "Show raw JSON"}
      </button>
      {expanded && <pre className="overflow-x-auto text-xs text-slate-300">{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
