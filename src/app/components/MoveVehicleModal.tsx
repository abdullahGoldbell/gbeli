'use client';

import { useState } from 'react';

export type MoveField =
  | { key: string; label: string; type: 'date'; defaultValue?: string; required?: boolean }
  | { key: string; label: string; type: 'text'; defaultValue?: string; required?: boolean }
  | { key: string; label: string; type: 'select'; options: string[]; defaultValue?: string; required?: boolean };

interface Props {
  title: string;
  fields: MoveField[];
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
}

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function MoveVehicleModal({ title, fields, submitLabel = 'Confirm', onClose, onSubmit }: Props) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      if (f.defaultValue !== undefined) init[f.key] = f.defaultValue;
      else if (f.type === 'date') init[f.key] = todayISO();
      else if (f.type === 'select') init[f.key] = f.options[0] ?? '';
      else init[f.key] = '';
    }
    return init;
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const f of fields) {
      if (f.required && !values[f.key]?.trim()) {
        alert(`${f.label} is required`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-xs text-neutral-500 font-medium">
                {f.label}{f.required ? ' *' : ''}
              </label>
              {f.type === 'select' ? (
                <select
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type}
                  value={values[f.key]}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} disabled={submitting}
              className="px-4 py-2 text-sm border rounded-md hover:bg-neutral-50">Cancel</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50">
              {submitting ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
