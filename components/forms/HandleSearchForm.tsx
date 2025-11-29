"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function HandleSearchForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("handle") ?? "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value) return;
    router.push(`/handles?handle=${encodeURIComponent(value)}`);
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        className="flex-1 rounded-xl border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        placeholder="Search @handle.ipn"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/20">
        Lookup
      </button>
    </form>
  );
}
