"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navItems: { href: Route; label: string; icon: string }[] = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "📝" },
  { href: "/blocks", label: "Blocks", icon: "🧱" },
  { href: "/accounts", label: "Accounts", icon: "👤" },
  { href: "/ipndht", label: "IPNDHT", icon: "🌐" },
  { href: "/handles", label: "Handles", icon: "🏷️" },
  { href: "/files", label: "Files", icon: "📁" },
  { href: "/network", label: "Network", icon: "🔗" },
  { href: "/status", label: "Status", icon: "💚" },
  { href: "/l2", label: "L2", icon: "⚡" }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-48 flex-none">
        <nav className="space-y-1 sticky top-20">
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

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-slate-950/95 backdrop-blur safe-area-pb">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition",
                  isActive
                    ? "text-emerald-300"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label.slice(0, 6)}</span>
              </Link>
            );
          })}
          {/* More menu */}
          <MobileMoreMenu items={navItems.slice(5)} pathname={pathname} />
        </div>
      </nav>
    </>
  );
}

function MobileMoreMenu({ items, pathname }: { items: typeof navItems; pathname: string | null }) {
  return (
    <div className="relative group">
      <button className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-slate-500 hover:text-slate-300">
        <span className="text-lg">⋯</span>
        <span className="text-[10px] font-medium">More</span>
      </button>
      
      {/* Popup menu */}
      <div className="absolute bottom-full right-0 mb-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <div className="rounded-lg border border-slate-800 bg-slate-900 shadow-xl p-2 min-w-[140px]">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition",
                  isActive
                    ? "bg-slate-800 text-emerald-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
