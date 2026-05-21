import type { ReactNode } from 'react';
import clsx from 'clsx';
import { HiArrowsUpDown } from 'react-icons/hi2';
import { EmptyState } from './Feedback';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  selectedRowId?: string | null;
  onRowClick?: (row: T) => void;
};

export function DataTable<T>({ columns, rows, getRowKey, selectedRowId, onRowClick }: DataTableProps<T>) {
  if (!rows.length) {
    return <EmptyState title="No records found" message="Try adjusting your filters or create the first record." />;
  }
  return (
    <div className="overflow-hidden rounded-lg border border-ink-100 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-ink-100 text-sm">
          <thead className="bg-ink-50 text-left text-xs font-semibold uppercase text-ink-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3">
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {column.sortable ? <HiArrowsUpDown size={14} /> : null}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((row) => {
              const key = getRowKey(row);
              const selected = selectedRowId != null && selectedRowId === key;
              return (
                <tr
                  key={key}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={clsx(
                    onRowClick && 'cursor-pointer',
                    selected ? 'bg-brand-50/80 hover:bg-brand-50' : 'hover:bg-ink-50'
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-ink-700">
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
