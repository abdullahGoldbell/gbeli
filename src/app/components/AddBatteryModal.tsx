'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSubmit: (data: Record<string, string | number | null>) => Promise<void>;
}

const FIELDS: { key: string; label: string; type?: 'text' | 'number' | 'date' }[] = [
  { key: 'regen_date', label: 'Regen Date', type: 'date' },
  { key: 'bat_sn', label: 'Battery S/N' },
  { key: 'fl', label: 'FL' },
  { key: 'model', label: 'Model' },
  { key: 'supplier', label: 'Supplier' },
  { key: 'customer', label: 'Customer' },
  { key: 'amt', label: 'Amount', type: 'number' },
  { key: 'supplier_invoice', label: 'Supplier Invoice' },
  { key: 'warranty', label: 'Warranty' },
  { key: 'volt', label: 'Volt' },
  { key: 'ah', label: 'AH' },
  { key: 'socket', label: 'Socket' },
];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddBatteryModal({ onClose, onSubmit }: Props) {
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of FIELDS) init[f.key] = f.key === 'regen_date' ? todayISO() : '';
    return init;
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bat_sn.trim()) {
      setError('Battery S/N is required');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const payload: Record<string, string | number | null> = {};
      for (const f of FIELDS) {
        const raw = form[f.key]?.trim() ?? '';
        if (raw === '') {
          payload[f.key] = null;
        } else if (f.type === 'number') {
          const n = Number(raw);
          payload[f.key] = Number.isFinite(n) ? n : null;
        } else {
          payload[f.key] = raw;
        }
      }
      await onSubmit(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add battery');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4">Add Battery</h2>
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-neutral-500 font-medium">
                {f.label}{f.key === 'bat_sn' ? ' *' : ''}
              </label>
              <input
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                step={f.type === 'number' ? '0.01' : undefined}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          ))}
          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm border rounded-md hover:bg-neutral-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700 font-medium disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Add Battery'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
