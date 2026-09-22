'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { SoldRecord } from '@/lib/types';
import InlineEdit from './InlineEdit';
import UploadModal from './UploadModal';
import { useColumnOrder, useOrderedColumns } from '@/lib/useColumnOrder';
import TablePagination from './TablePagination';
import SortableTableHead from './ui/SortableTableHead';

interface Props {
  onChanged?: () => void;
}

type SortDir = 'asc' | 'desc';

const COLUMNS: { key: keyof SoldRecord; label: string; type?: 'text' | 'number' | 'date' }[] = [
  { key: 'sold_date', label: 'Sold Date', type: 'date' },
  { key: 'brand', label: 'Brand' },
  { key: 'model', label: 'Model' },
  { key: 'customer', label: 'Customer' },
  { key: 'veh_no', label: 'Veh No' },
  { key: 'chassis_no', label: 'Chassis No.' },
  { key: 'mast', label: 'Mast' },
  { key: 'attachment', label: 'Attachment' },
  { key: 'yor', label: 'YOR', type: 'number' },
  { key: 'yom', label: 'YOM', type: 'number' },
  { key: 'lta_reg', label: 'LTA Reg' },
  { key: 'salesman', label: 'Salesman' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'do_no', label: 'DO No.' },
];
const PAGE_SIZE = 40;

export default function SoldTable({ onChanged }: Props) {
  const [data, setData] = useState<SoldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof SoldRecord, string>>>({});
  const [sortKey, setSortKey] = useState<keyof SoldRecord>('sold_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);

  const { order, dragProps, dragClass, reset } = useColumnOrder(
    'fms.columnOrder.sold',
    COLUMNS.map((c) => c.key as string),
  );
  const orderedColumns = useOrderedColumns(COLUMNS, order, (c) => c.key as string);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/sold')
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error(body?.error || `Request failed (${r.status})`);
        }
        return r.json();
      })
      .then((j) => {
        if (Array.isArray(j)) setData(j);
        else setError(j?.error || 'Failed to load');
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Network error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdate = useCallback(async (id: number, field: string, value: string | number | boolean | null) => {
    try {
      const res = await fetch(`/api/sold/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setData((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e) {
      console.error(e);
      alert('Failed to save change');
    }
  }, []);

  const handleDelete = useCallback(async (id: number, vehNo: string | null) => {
    if (!confirm(`Delete ${vehNo || `row ${id}`}?`)) return;
    try {
      const res = await fetch(`/api/sold/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setData((prev) => prev.filter((r) => r.id !== id));
      onChanged?.();
    } catch (e) {
      console.error(e);
      alert('Failed to delete');
    }
  }, [onChanged]);

  const filtered = useMemo(() => {
    const out = data.filter((row) => {
      for (const k of Object.keys(filters) as (keyof SoldRecord)[]) {
        const f = (filters[k] || '').toLowerCase();
        if (!f) continue;
        const v = String(row[k] ?? '').toLowerCase();
        if (!v.includes(f)) return false;
      }
      return true;
    });
    out.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return out;
  }, [data, filters, sortKey, sortDir]);

  useEffect(() => { setPage(1); }, [filters, sortKey, sortDir]);

  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (k: keyof SoldRecord) => {
    if (k === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  if (loading) return <div className="bg-white rounded-lg p-12 text-center text-neutral-400">Loading sold records...</div>;
  if (error) return <div className="bg-alert-soft border border-danger/30 rounded-lg p-4 text-sm text-danger">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-800">Sold Vehicles</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">{filtered.length} of {data.length} rows</span>
          <button onClick={reset} className="px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-800" title="Reset column order">↔ Reset Columns</button>
          <button onClick={() => window.open('/api/export?type=sold', '_blank')} className="px-3 py-1.5 bg-success text-white text-xs font-medium rounded-md hover:bg-success-dark">↓ Export Excel</button>
          <button onClick={() => setShowUpload(true)} className="px-3 py-1.5 bg-charcoal-light text-white text-xs font-medium rounded-md hover:bg-charcoal">↑ Upload Sold Excel</button>
        </div>
      </div>
      {showUpload && (
        <UploadModal mode="sold" onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); fetchData(); onChanged?.(); }} />
      )}
      <div className="overflow-x-auto">
        <table className="text-sm w-full">
          <SortableTableHead
            columns={orderedColumns}
            sortKey={sortKey}
            sortDir={sortDir}
            onToggleSort={toggleSort}
            filters={filters}
            onFiltersChange={setFilters}
            dragProps={dragProps}
            dragClass={dragClass}
          />
          <tbody>
            {pageRows.map((row) => (
              <tr key={row.id} className="hover:bg-command-hover/60 border-b border-neutral-100">
                {orderedColumns.map((c) => {
                  const v = row[c.key];
                  let display: string | number | null = (v ?? '') as string | number | null;
                  if (c.key === 'sold_date' && v) display = String(v).slice(0, 10);
                  return (
                    <td key={c.key as string} className="px-2 py-1 max-w-[200px]">
                      <InlineEdit
                        value={display}
                        field={c.key as string}
                        type={c.type === 'date' ? 'text' : (c.type as 'text' | 'number' | undefined)}
                        readOnly={false}
                        onSave={(f, val) => handleUpdate(row.id, f, val)}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-center">
                  <button onClick={() => handleDelete(row.id, row.veh_no)} className="text-danger hover:text-primary-accessible-hover text-sm" title="Delete">✕</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={orderedColumns.length + 1} className="px-4 py-8 text-center text-neutral-400">No matching records</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination page={page} pageSize={PAGE_SIZE} totalRows={filtered.length} onPageChange={setPage} />
    </div>
  );
}
