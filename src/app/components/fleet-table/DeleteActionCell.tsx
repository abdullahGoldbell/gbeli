'use client';

import { FleetRecord } from '@/lib/types';

interface Props {
  row: FleetRecord;
  onDelete: (id: number, vehNo: string) => void;
}

export default function DeleteActionCell({ row, onDelete }: Props) {
  return (
    <button
      onClick={() => {
        if (confirm(`Delete ${row.veh_no}?`)) onDelete(row.id, row.veh_no);
      }}
      className="text-red-400 hover:text-red-600 text-sm"
      title="Delete"
    >
      ✕
    </button>
  );
}
