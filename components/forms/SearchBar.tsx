"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { routeForQuery } from "@/lib/identify";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;

    const destination = routeForQuery(value);
    if (destination && destination !== "/") {
      router.push(destination as Route);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <input
        type="search"
        placeholder="Search blocks, transactions, accounts, handles or HashTimers"
        className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
    </form>
  );
}
