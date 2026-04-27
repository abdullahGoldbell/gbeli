'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BatteryRecord } from '@/lib/types';
import UploadModal from './UploadModal';

type SortDir = 'asc' | 'desc';

const COLUMNS: { key: keyof BatteryRecord; label: string }[] = [
  { key: 'regen_date', label: 'Regen Date' },
  { key: 'bat_sn', label: 'Bat S/N' },
  { key: 'fl', label: 'FL' },
  { key: 'model', label: 'Model' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'customer', label: 'Customer' },
  { key: 'amt', label: 'Amount' },
  { key: 'supplier_invoice', label: 'Invoice' },
  { key: 'warranty', label: 'Warranty' },
  { key: 'volt', label: 'Volt' },
  { key: 'ah', label: 'AH' },
  { key: 'socket', label: 'Socket' },
];

export default function BatteryTable() {
  const [data, setData] = useState<BatteryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Partial<Record<keyof BatteryRecord, string>>>({});
  const [sortKey, setSortKey] = useState<keyof BatteryRecord>('regen_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showUpload, setShowUpload] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch('/api/battery')
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j)) setData(j);
        else setError(j.error || 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const toggleSort = (k: keyof BatteryRecord) => {
    if (k === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };

  if (loading) return <div className="bg-white rounded-lg p-12 text-center text-neutral-400">Loading battery prices...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-auto">
      <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <h2 className="font-semibold text-neutral-800">Battery Prices</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">{filtered.length} of {data.length} rows</span>
          <button
            onClick={() => setShowUpload(true)}
            className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-md hover:bg-violet-700"
          >
            ↑ Upload Battery Excel
          </button>
        </div>
      </div>
      {showUpload && (
        <UploadModal
          mode="battery"
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setShowUpload(false); fetchData(); }}
        />
      )}
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 sticky top-0">
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key as string} className="px-2 py-2 text-left font-medium text-neutral-700 border-b">
                <button onClick={() => toggleSort(c.key)} className="hover:text-blue-600 flex items-center gap-1">
                  {c.label}
                  {sortKey === c.key && <span className="text-xs">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                </button>
              </th>
            ))}
          </tr>
          <tr>
            {COLUMNS.map((c) => (
              <th key={`f-${c.key as string}`} className="px-2 py-1 border-b bg-neutral-50">
                <input
                  value={filters[c.key] || ''}
                  onChange={(e) => setFilters({ ...filters, [c.key]: e.target.value })}
                  placeholder="Filter..."
                  className="w-full px-2 py-1 text-xs border border-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.id} className="hover:bg-blue-50/30 border-b border-neutral-100">
              {COLUMNS.map((c) => {
                const v = row[c.key];
                let display: string = v == null ? '' : String(v);
                if (c.key === 'regen_date' && v) display = String(v).slice(0, 10);
                if (c.key === 'amt' && typeof v === 'number') display = v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                return <td key={c.key as string} className="px-2 py-1.5 text-neutral-700 truncate max-w-[200px]" title={display}>{display}</td>;
              })}
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr><td colSpan={COLUMNS.length} className="px-4 py-8 text-center text-neutral-400">No matching records</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
