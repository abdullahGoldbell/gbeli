'use client';

import { FleetRecord } from '@/lib/types';
import { RELEASE_STATUSES } from './constants';

interface Props {
  row: FleetRecord;
  value: string | null;
  readOnly: boolean;
  onUpdate: (id: number, field: string, value: string | number | boolean | null) => void;
  onStatusMove?: (row: FleetRecord, status: 'Out' | 'Sold') => void;
}

export default function ReleaseStatusCell({ row, value, readOnly, onUpdate, onStatusMove }: Props) {
  if (readOnly) {
    return <div className="text-neutral-600">{value || <span className="text-neutral-300">-</span>}</div>;
  }
  const current = (value as string) || '';
  return (
    <select
      aria-label="Release status"
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        if (v === 'Out' || v === 'Sold') {
          if (onStatusMove) onStatusMove(row, v as 'Out' | 'Sold');
        } else {
          onUpdate(row.id, 'release_status', v || null);
        }
      }}
      className="w-full px-1 py-0.5 text-sm border border-transparent hover:border-primary-light focus:border-primary rounded bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
    >
      <option value="">-</option>
      {RELEASE_STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
