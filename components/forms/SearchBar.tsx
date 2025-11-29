"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    if (value.startsWith("@")) {
      router.push(`/handles?handle=${encodeURIComponent(value)}`);
      return;
    }

    if (/^0x[a-fA-F0-9]{40,}$/.test(value)) {
      router.push(`/accounts/${value}`);
      return;
    }

    if (/^[a-fA-F0-9]{64}$/.test(value)) {
      router.push(`/tx/${value}`);
      return;
    }

    if (/^\d+$/.test(value)) {
      router.push(`/blocks/${value}`);
      return;
    }

    router.push(`/accounts/${value}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="search"
        placeholder="Search blocks, transactions, accounts or handles"
        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}
