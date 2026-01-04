import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-2 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold tracking-tight text-slate-50 sm:text-xl md:text-2xl">
          {title}
        </h1>
        {description && (
          <div className="mt-1 text-sm text-slate-400 break-all">
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 shrink-0 mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
}
