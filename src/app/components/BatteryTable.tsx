'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BatteryRecord } from '@/lib/types';
import InlineEdit from './InlineEdit';
import UploadModal from './UploadModal';
import AddBatteryModal from './AddBatteryModal';
import { useColumnOrder, useOrderedColumns } from '@/lib/useColumnOrder';
import TablePagination from './TablePagination';
import SortableTableHead from './ui/SortableTableHead';
import ToolbarButton from './ui/ToolbarButton';

interface Props {
  onChanged?: () => void;
}

type SortDir = 'asc' | 'desc';

const COLUMNS: { key: keyof BatteryRecord; label: string; type?: 'text' | 'number' }[] = [
  { key: 'regen_date', label: 'Regen Date' },
  { key: 'bat_sn', label: 'Bat S/N' },
  { key: 'fl', label: 'FL' },
  { key: 'model', label: 'Model' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'customer', label: 'Customer' },
  { key: 'amt', label: 'Amount', type: 'number' },
  { key: 'supplier_invoice', label: 'Invoice' },
  { key: 'warranty', label: 'Warranty' },
  { key: 'volt', label: 'Volt' },
  { key: 'ah', label: 'AH' },
  { key: 'socket', label: 'Socket' },
];
const PAGE_SIZE = 40;

export default function BatteryTable({ onChanged }: Props) {
  const [data, setData] = useState<BatteryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof BatteryRecord, string>>>({});
  const [sortKey, setSortKey] = useState<keyof BatteryRecord>('regen_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const { order, dragProps, dragClass, reset } = useColumnOrder(
    'fms.columnOrder.battery',
    COLUMNS.map((c) => c.key as string),
  );
  const orderedColumns = useOrderedColumns(COLUMNS, order, (c) => c.key as string);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/battery')
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
      const res = await fetch(`/api/battery/${id}`, {
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

  const handleAdd = useCallback(async (payload: Record<string, string | number | null>) => {
    const res = await fetch('/api/battery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || 'Failed to add battery');
    }
    const created = await res.json();
    setData((prev) => [created, ...prev]);
    setShowAdd(false);
    onChanged?.();
  }, [onChanged]);

  const handleDelete = useCallback(async (id: number, label: string | null) => {
    if (!confirm(`Delete ${label || `row ${id}`}?`)) return;
    try {
      const res = await fetch(`/api/battery/${id}`, { method: 'DELETE' });
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
      for (const k of Object.keys(filters) as (keyof BatteryRecord)[]) {
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

  const toggleSort = (k: keyof BatteryRecord) => {
    if (k === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  if (loading) return <div className="bg-white rounded-lg p-12 text-center text-neutral-400">Loading battery prices...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-800">Battery Prices</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">{filtered.length} of {data.length} rows</span>
          <button onClick={reset} className="px-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-800" title="Reset column order">↔ Reset Columns</button>
          <ToolbarButton tone="blue" onClick={() => setShowAdd(true)}>+ Add Battery</ToolbarButton>
          <ToolbarButton tone="green" onClick={() => window.open('/api/export?type=battery', '_blank')}>↓ Export Excel</ToolbarButton>
          <ToolbarButton tone="violet" onClick={() => setShowUpload(true)}>↑ Upload Battery Excel</ToolbarButton>
        </div>
      </div>
      {showAdd && (
        <AddBatteryModal onClose={() => setShowAdd(false)} onSubmit={handleAdd} />
      )}
      {showUpload && (
        <UploadModal mode="battery" onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); fetchData(); onChanged?.(); }} />
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
              <tr key={row.id} className="hover:bg-blue-50/30 border-b border-neutral-100">
                {orderedColumns.map((c) => {
                  const v = row[c.key];
                  let display: string | number | null = (v ?? '') as string | number | null;
                  if (c.key === 'regen_date' && v) display = String(v).slice(0, 10);
                  return (
                    <td key={c.key as string} className="px-2 py-1 max-w-[180px]">
                      <InlineEdit
                        value={display}
                        field={c.key as string}
                        type={c.type as 'text' | 'number' | undefined}
                        readOnly={false}
                        onSave={(f, val) => handleUpdate(row.id, f, val)}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 text-center">
                  <button onClick={() => handleDelete(row.id, row.fl)} className="text-red-400 hover:text-red-600 text-sm" title="Delete">✕</button>
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
