'use client';

import { ReactNode } from 'react';
import type { useColumnOrder } from '@/lib/useColumnOrder';

type ColumnOrder = ReturnType<typeof useColumnOrder>;
export type SortDir = 'asc' | 'desc';

interface Column<K extends string> {
  key: K;
  label: string;
}

interface Props<K extends string> {
  columns: readonly Column<K>[];
  sortKey: K;
  sortDir: SortDir;
  onToggleSort: (key: K) => void;
  filters: Partial<Record<K, string>>;
  onFiltersChange: (next: Partial<Record<K, string>>) => void;
  dragProps: ColumnOrder['dragProps'];
  dragClass: ColumnOrder['dragClass'];
  /** Extra header cells rendered after the data columns (e.g. a Status column). */
  extraHeaders?: ReactNode;
  /** Number of trailing action columns (rendered as empty cells in both rows). */
  actionColumns?: number;
}

const HEADER_CELL = 'px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap';
const FILTER_INPUT = 'w-full px-2 py-1 text-xs text-neutral-800 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500';

/** Two-row table head shared by the list views: draggable sort headers + per-column filters. */
export default function SortableTableHead<K extends string>(props: Props<K>) {
  const { columns, sortKey, sortDir, onToggleSort, filters, onFiltersChange, dragProps, dragClass } = props;
  const { extraHeaders, actionColumns = 1 } = props;
  const blanks = Array.from({ length: actionColumns }, (_, i) => i);

  return (
    <thead className="bg-neutral-800 text-white sticky top-0">
      <tr>
        {columns.map((c) => (
          <th
            key={c.key}
            {...dragProps(c.key)}
            className={`${HEADER_CELL} cursor-move transition-colors ${dragClass(c.key)}`}
            title="Drag to reorder column"
          >
            <button onClick={() => onToggleSort(c.key)} className="hover:text-blue-300 flex items-center gap-1">
              <span className="text-neutral-500">⋮⋮</span>
              {c.label}
              {sortKey === c.key && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
            </button>
          </th>
        ))}
        {extraHeaders}
        {blanks.map((i) => <th key={`a-${i}`} className="px-2 py-2 w-10" />)}
      </tr>
      <tr className="bg-neutral-100">
        {columns.map((c) => (
          <th key={`f-${c.key}`} className="px-2 py-1">
            <input
              value={filters[c.key] || ''}
              onChange={(e) => onFiltersChange({ ...filters, [c.key]: e.target.value })}
              aria-label={`Filter ${c.label}`}
              placeholder="Filter..."
              className={FILTER_INPUT}
            />
          </th>
        ))}
        {extraHeaders ? <th /> : null}
        {blanks.map((i) => <th key={`fa-${i}`} />)}
      </tr>
    </thead>
  );
}

/** Column header cell for non-sortable extra columns, styled like the data headers. */
export function StaticHeaderCell({ children }: { children: ReactNode }) {
  return <th className={HEADER_CELL}>{children}</th>;
}
