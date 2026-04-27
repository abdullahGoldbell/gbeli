'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { OutRecord } from '@/lib/types';
import InlineEdit from './InlineEdit';
import UploadModal from './UploadModal';

type SortDir = 'asc' | 'desc';

const COLUMNS: { key: keyof OutRecord; label: string; type?: 'text' | 'number' }[] = [
  { key: 'out_date', label: 'Out Date' },
  { key: 'category', label: 'Category' },
  { key: 'brand', label: 'Brand' },
  { key: 'model', label: 'Model' },
  { key: 'name', label: 'Name' },
  { key: 'veh_no', label: 'Veh No' },
  { key: 'container_mast', label: 'Closed Mast' },
  { key: 'chassis', label: 'Chassis' },
  { key: 'mast', label: 'Mast' },
  { key: 'attachment', label: 'Att' },
  { key: 'yor', label: 'YOR', type: 'number' },
  { key: 'yom', label: 'YOM', type: 'number' },
  { key: 'customer_name', label: 'Customer' },
  { key: 'condition', label: 'Condition' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'remarks', label: 'Remarks' },
  { key: 'lta_reg', label: 'LTA Reg' },
];

export default function OutTable() {
  const [data, setData] = useState<OutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof OutRecord, string>>>({});
  const [sortKey, setSortKey] = useState<keyof OutRecord>('out_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showUpload, setShowUpload] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/out')
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j)) setData(j);
        else setError(j.error || 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleUpdate = useCallback(async (id: number, field: string, value: string | number | boolean | null) => {
    try {
      const res = await fetch(`/api/out/${id}`, {
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
      const res = await fetch(`/api/out/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setData((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete');
    }
  }, []);

  const filtered = useMemo(() => {
    const out = data.filter((row) => {
      for (const k of Object.keys(filters) as (keyof OutRecord)[]) {
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

  const toggleSort = (k: keyof OutRecord) => {
    if (k === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  if (loading) return <div className="bg-white rounded-lg p-12 text-center text-neutral-400">Loading out records...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-800">Out Vehicles</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">{filtered.length} of {data.length} rows</span>
          <button onClick={() => setShowUpload(true)} className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700">↑ Upload OUT Excel</button>
        </div>
      </div>
      {showUpload && (
        <UploadModal mode="out" onClose={() => setShowUpload(false)} onSuccess={() => { setShowUpload(false); fetchData(); }} />
      )}
      <div className="overflow-x-auto">
        <table className="text-sm w-full">
          <thead className="bg-neutral-800 text-white sticky top-0">
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key as string} className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">
                  <button onClick={() => toggleSort(c.key)} className="hover:text-blue-300 flex items-center gap-1">
                    {c.label}
                    {sortKey === c.key && <span className="text-xs">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </button>
                </th>
              ))}
              <th className="px-2 py-2 w-10" />
            </tr>
            <tr className="bg-neutral-100">
              {COLUMNS.map((c) => (
                <th key={`f-${c.key as string}`} className="px-2 py-1">
                  <input
                    value={filters[c.key] || ''}
                    onChange={(e) => setFilters({ ...filters, [c.key]: e.target.value })}
                    placeholder="Filter..."
                    className="w-full px-2 py-1 text-xs text-neutral-800 border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="hover:bg-blue-50/30 border-b border-neutral-100">
                {COLUMNS.map((c) => {
                  const v = row[c.key];
                  let display: string | number | null = (v ?? '') as string | number | null;
                  if (c.key === 'out_date' && v) display = String(v).slice(0, 10);
                  return (
                    <td key={c.key as string} className="px-2 py-1 max-w-[200px]">
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
                  <button onClick={() => handleDelete(row.id, row.veh_no)} className="text-red-400 hover:text-red-600 text-sm" title="Delete">✕</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 1} className="px-4 py-8 text-center text-neutral-400">No matching records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
