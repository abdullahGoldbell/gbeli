'use client';

import { flexRender, Table } from '@tanstack/react-table';
import { FleetRecord } from '@/lib/types';

interface Props {
  table: Table<FleetRecord>;
  updatedRowIds: Set<number>;
}

export default function FleetTableBody({ table, updatedRowIds }: Props) {
  return (
    <tbody>
      {table.getRowModel().rows.map((row) => (
        <tr key={row.id} className={`border-b border-neutral-100 hover:bg-blue-50/50 ${updatedRowIds.has(row.original.id) ? 'row-updated' : ''}`}>
          {row.getVisibleCells().map((cell) => (
            <td key={cell.id} className="px-2 py-1.5 overflow-hidden" style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}
