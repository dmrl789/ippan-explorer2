import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  headerSlot?: ReactNode;
}

export function Card({ title, description, children, headerSlot }: CardProps) {
  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-sm shadow-black/40">
      {(title || description || headerSlot) && (
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <p className="text-sm font-semibold text-slate-100">{title}</p>}
            {description && <p className="text-xs text-slate-400">{description}</p>}
          </div>
          {headerSlot}
        </div>
      )}
      <div className="space-y-3 text-sm text-slate-100">{children}</div>
    </section>
  );
}
