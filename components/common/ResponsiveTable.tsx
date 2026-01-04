"use client";

import type { ReactNode } from "react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  /** Render cell content */
  render?: (row: T, index: number) => ReactNode;
  /** Render mobile card field (defaults to render) */
  renderMobile?: (row: T, index: number) => ReactNode;
  /** Hide column on mobile */
  hideOnMobile?: boolean;
  /** Priority for mobile cards (lower = shown first) */
  mobilePriority?: number;
  /** Column width class */
  width?: string;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Get unique key for row */
  keyExtractor?: (row: T, index: number) => string;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Loading state */
  loading?: boolean;
  /** Number of skeleton rows to show when loading */
  skeletonRows?: number;
  /** Click handler for row */
  onRowClick?: (row: T, index: number) => void;
}

/**
 * Responsive table that shows as table on desktop, cards on mobile.
 */
export function ResponsiveTable<T>({ 
  columns, 
  data,
  keyExtractor = (_, i) => String(i),
  emptyMessage = "No data",
  emptyDescription,
  loading = false,
  skeletonRows = 5,
  onRowClick,
}: ResponsiveTableProps<T>) {
  // Desktop columns (excludes hideOnMobile)
  const desktopColumns = columns;
  
  // Mobile columns sorted by priority
  const mobileColumns = columns
    .filter(c => !c.hideOnMobile)
    .sort((a, b) => (a.mobilePriority ?? 99) - (b.mobilePriority ?? 99));
  
  if (loading) {
    return (
      <div className="space-y-3">
        {/* Desktop skeleton */}
        <div className="hidden md:block">
          <SkeletonTable columns={columns.length} rows={skeletonRows} />
        </div>
        {/* Mobile skeleton */}
        <div className="md:hidden space-y-3">
          {Array(skeletonRows).fill(null).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }
  
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-8 text-center">
        <p className="text-sm text-slate-400">{emptyMessage}</p>
        {emptyDescription && (
          <p className="mt-1 text-xs text-slate-500">{emptyDescription}</p>
        )}
      </div>
    );
  }
  
  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40 shadow-inner shadow-black/40">
        <table className="table-grid w-full">
          <thead>
            <tr>
              {desktopColumns.map((column) => (
                <th 
                  key={String(column.key)} 
                  className={column.width}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr 
                key={keyExtractor(row, rowIndex)} 
                className={`text-xs sm:text-sm ${onRowClick ? "cursor-pointer hover:bg-slate-900/60" : ""}`}
                onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
              >
                {desktopColumns.map((column) => (
                  <td key={String(column.key)}>
                    {column.render 
                      ? column.render(row, rowIndex) 
                      : (row as Record<string, ReactNode>)[column.key as string]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {data.map((row, rowIndex) => (
          <div 
            key={keyExtractor(row, rowIndex)}
            className={`
              rounded-xl border border-slate-800 bg-slate-900/60 p-4
              ${onRowClick ? "cursor-pointer active:bg-slate-800/60" : ""}
            `}
            onClick={onRowClick ? () => onRowClick(row, rowIndex) : undefined}
          >
            <div className="space-y-2">
              {mobileColumns.map((column) => {
                const content = column.renderMobile 
                  ? column.renderMobile(row, rowIndex)
                  : column.render 
                    ? column.render(row, rowIndex)
                    : (row as Record<string, ReactNode>)[column.key as string];
                
                return (
                  <div key={String(column.key)} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-slate-500 shrink-0">{column.header}</span>
                    <span className="text-sm text-slate-200 text-right">{content}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SkeletonTable({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/40">
      <table className="w-full">
        <thead>
          <tr>
            {Array(columns).fill(null).map((_, i) => (
              <th key={i} className="border-b border-slate-800/80 bg-slate-900/80 px-3 py-2">
                <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array(rows).fill(null).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array(columns).fill(null).map((_, colIndex) => (
                <td key={colIndex} className="border-b border-slate-900/60 px-3 py-3">
                  <div className="h-4 w-full animate-pulse rounded bg-slate-800/60" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
      {Array(3).fill(null).map((_, i) => (
        <div key={i} className="flex justify-between">
          <div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-32 animate-pulse rounded bg-slate-800/60" />
        </div>
      ))}
    </div>
  );
}
