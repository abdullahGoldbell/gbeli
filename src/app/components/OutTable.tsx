'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { OutRecord } from '@/lib/types';
import InlineEdit from './InlineEdit';
import UploadModal from './UploadModal';
import MoveVehicleModal from './MoveVehicleModal';
import { getSocket } from '@/lib/socket';
import { showToast } from './Notifications';

type SortDir = 'asc' | 'desc';

const CONDITIONS = ['REPAIRING', 'PENDING QUOTATION', 'OK', 'PENDING PRE-DEPLOYMENT', 'PENDING POST-DEPLOYMENT', 'AWAITING FOR SPARES', 'CANIBALISED'];

const COLUMNS: { key: keyof OutRecord; label: string; type?: 'text' | 'number' | 'select'; options?: string[] }[] = [
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
  { key: 'condition', label: 'Condition', type: 'select', options: CONDITIONS },
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
  const [restoreFor, setRestoreFor] = useState<OutRecord | null>(null);

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

  const handleRestore = useCallback(async (id: number, values: Record<string, string>) => {
    try {
      const res = await fetch(`/api/out/${id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ in_date: values.in_date, fleet_type: values.fleet_type }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || 'Restore failed');
      }
      const result = await res.json();
      setData((prev) => prev.filter((r) => r.id !== id));
      setRestoreFor(null);
      if (result.fleet) getSocket().emit('fleet:created', result.fleet);
      showToast(`${result.fleet?.veh_no || 'Vehicle'} moved back to Fleet`, 'success');
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : 'Restore failed';
      alert(msg);
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
              <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap">Status</th>
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
                        type={c.type === 'select' ? 'select' : (c.type as 'text' | 'number' | undefined)}
                        options={c.options}
                        readOnly={false}
                        onSave={(f, val) => handleUpdate(row.id, f, val)}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1">
                  <select
                    value="Out"
                    onChange={(e) => {
                      if (e.target.value === 'In') setRestoreFor(row);
                    }}
                    className="w-full px-1 py-0.5 text-sm border border-transparent hover:border-blue-300 focus:border-blue-400 rounded bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500"
                    title="Set In to move back to Fleet"
                  >
                    <option value="Out">Out</option>
                    <option value="In">In</option>
                  </select>
                </td>
                <td className="px-2 py-1 text-center">
                  <button onClick={() => handleDelete(row.id, row.veh_no)} className="text-red-400 hover:text-red-600 text-sm" title="Delete">✕</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={COLUMNS.length + 2} className="px-4 py-8 text-center text-neutral-400">No matching records</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {restoreFor && (
        <MoveVehicleModal
          title={`Move ${restoreFor.veh_no || 'vehicle'} back to Fleet`}
          submitLabel="Move to Fleet"
          fields={[
            { key: 'in_date', label: 'In Date', type: 'date', required: true },
            { key: 'fleet_type', label: 'Fleet Type', type: 'select', options: ['ELECTRICAL', 'DIESEL'], required: true },
          ]}
          onClose={() => setRestoreFor(null)}
          onSubmit={(values) => handleRestore(restoreFor.id, values)}
        />
      )}
    </div>
  );
}
