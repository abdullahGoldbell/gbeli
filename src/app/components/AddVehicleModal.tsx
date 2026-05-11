'use client';

import { useMemo, useState } from 'react';
import { FleetRecord } from '@/lib/types';

interface Props {
  onClose: () => void;
  onSubmit: (data: Record<string, string | number | boolean | null>) => void;
  existing?: FleetRecord[];
}

const SUGGEST_FIELDS = [
  'brand', 'model', 'category', 'mast', 'attachment', 'customer_name',
] as const satisfies readonly (keyof FleetRecord)[];

export default function AddVehicleModal({ onClose, onSubmit, existing = [] }: Props) {
  const [form, setForm] = useState({
    fleet_type: 'ELECTRICAL',
    veh_no: '',
    brand: '',
    model: '',
    category: '',
    chassis: '',
    mast: '',
    attachment: '',
    yor: '',
    yom: '',
    condition: 'OK',
    release_status: 'Hold',
    customer_name: '',
    salesman_name: '',
    remarks: '',
    location: '',
  });

  const suggestions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const field of SUGGEST_FIELDS) {
      const set = new Set<string>();
      for (const r of existing) {
        const v = r[field];
        if (typeof v === 'string' && v.trim()) set.add(v.trim());
      }
      out[field] = Array.from(set).sort();
    }
    return out;
  }, [existing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.veh_no.trim()) return;
    onSubmit({
      ...form,
      yor: form.yor ? parseInt(form.yor) : null,
      yom: form.yom ? parseInt(form.yom) : null,
    });
  };

  const textFields: [keyof typeof form, string][] = [
    ['brand', 'Brand'], ['model', 'Model'], ['category', 'Category'],
    ['chassis', 'Chassis'], ['mast', 'Mast'], ['attachment', 'Attachment'],
    ['yor', 'Year of Reg'], ['yom', 'Year of Mfg'],
    ['customer_name', 'Customer'], ['salesman_name', 'Salesman'], ['location', 'Location'],
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Add New Vehicle</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500 font-medium">Fleet Type *</label>
            <select value={form.fleet_type} onChange={(e) => setForm({ ...form, fleet_type: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm">
              <option value="ELECTRICAL">Electrical</option>
              <option value="DIESEL">Diesel</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500 font-medium">Vehicle No *</label>
            <input value={form.veh_no} onChange={(e) => setForm({ ...form, veh_no: e.target.value })}
              placeholder="FL0000" required
              className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          {textFields.map(([key, label]) => {
            const listId = suggestions[key] ? `sugg-${key}` : undefined;
            return (
              <div key={key}>
                <label className="text-xs text-neutral-500 font-medium">{label}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  list={listId}
                  autoComplete="off"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
                {listId && (
                  <datalist id={listId}>
                    {suggestions[key].map((opt) => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                )}
              </div>
            );
          })}
          <div>
            <label className="text-xs text-neutral-500 font-medium">Condition</label>
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm">
              {['REPAIRING', 'PENDING QUOTATION', 'OK', 'PENDING PRE-DEPLOYMENT', 'PENDING POST-DEPLOYMENT', 'AWAITING FOR SPARES', 'CANIBALISED'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500 font-medium">Release Status</label>
            <select value={form.release_status} onChange={(e) => setForm({ ...form, release_status: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm">
              {['Release', 'Hold', 'Reserved'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-neutral-500 font-medium">Remarks</label>
            <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full px-3 py-2 border rounded-md text-sm" />
          </div>
          <div className="col-span-2 flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm border rounded-md hover:bg-neutral-50">Cancel</button>
            <button type="submit"
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium">Add Vehicle</button>
          </div>
        </form>
      </div>
    </div>
  );
}
