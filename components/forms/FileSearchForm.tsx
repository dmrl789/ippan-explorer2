"use client";

import type { Route } from "next";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function FileSearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [id, setId] = useState(params.get("id") ?? params.get("query") ?? "");
  const [owner, setOwner] = useState(params.get("owner") ?? "");
  const [tag, setTag] = useState(params.get("tag") ?? "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (id.trim()) next.set("id", id.trim());
    if (owner.trim()) next.set("owner", owner.trim());
    if (tag.trim()) next.set("tag", tag.trim());
    const query = next.toString();
    router.push((`/files${query ? `?${query}` : ""}` as Route));
  };

  return (
    <form onSubmit={submit} className="grid gap-2 md:grid-cols-3">
      <input
        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        placeholder="File id (or partial)"
        value={id}
        onChange={(event) => setId(event.target.value)}
      />
      <input
        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        placeholder="Owner address"
        value={owner}
        onChange={(event) => setOwner(event.target.value)}
      />
      <div className="flex gap-2">
        <input
          className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          placeholder="Tag (e.g. ai_model)"
          value={tag}
          onChange={(event) => setTag(event.target.value)}
        />
        <button className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20">
          Apply
        </button>
      </div>
    </form>
  );
}

