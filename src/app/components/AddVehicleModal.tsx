'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onSubmit: (data: Record<string, string | number | boolean | null>) => void;
}

export default function AddVehicleModal({ onClose, onSubmit }: Props) {
  const [form, setForm] = useState({
    fleet_type: 'ELECTRICAL',
    veh_no: '',
    brand: '',
    model: '',
    category: '',
    chassis: '',
    mast: '',
    yor: '',
    yom: '',
    condition: 'OK',
    release_status: 'Hold',
    customer_name: '',
    salesman_name: '',
    remarks: '',
    location: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.veh_no.trim()) return;
    onSubmit({
      ...form,
      yor: form.yor ? parseInt(form.yor) : null,
      yom: form.yom ? parseInt(form.yom) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()}>
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
          {[
            ['brand', 'Brand'], ['model', 'Model'], ['category', 'Category'],
            ['chassis', 'Chassis'], ['mast', 'Mast'], ['yor', 'Year of Reg'],
            ['yom', 'Year of Mfg'], ['customer_name', 'Customer'], ['salesman_name', 'Salesman'], ['location', 'Location'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="text-xs text-neutral-500 font-medium">{label}</label>
              <input value={form[key as keyof typeof form]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="w-full px-3 py-2 border rounded-md text-sm" />
            </div>
          ))}
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
