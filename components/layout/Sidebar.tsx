"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems: { href: Route; label: string }[] = [
  { href: "/", label: "Dashboard" },
  { href: "/blocks", label: "Blocks" },
  { href: "/accounts", label: "Accounts" },
  { href: "/ipndht", label: "IPNDHT" },
  { href: "/handles", label: "Handles" },
  { href: "/files", label: "Files" },
  { href: "/network", label: "Network" },
  { href: "/status", label: "Status" },
  { href: "/l2", label: "L2" }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-48 flex-none lg:block">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-xl px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900/80 text-emerald-300 shadow-inner shadow-emerald-500/20"
                  : "text-slate-400 hover:bg-slate-900/40 hover:text-slate-100"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
