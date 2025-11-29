import type { ReactNode } from "react";

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface SimpleTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export default function SimpleTable<T>({ columns, data, emptyMessage = "No data" }: SimpleTableProps<T>) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 shadow-inner shadow-black/40">
      <table className="table-grid">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={String(column.key)}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="text-xs sm:text-sm">
              {columns.map((column) => (
                <td key={String(column.key)}>
                  {column.render ? column.render(row) : (row as Record<string, ReactNode>)[column.key as string]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
