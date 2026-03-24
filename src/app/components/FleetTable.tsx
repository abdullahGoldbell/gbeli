'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnResizeMode,
} from '@tanstack/react-table';
import { FleetRecord } from '@/lib/types';
import InlineEdit from './InlineEdit';

interface Props {
  data: FleetRecord[];
  onUpdate: (id: number, field: string, value: string | number | boolean | null) => void;
  onDelete: (id: number, vehNo: string) => void;
  updatedRowIds: Set<number>;
  hiddenColumns: string[];
}

const CONDITIONS = ['OK', 'REPAIRING', 'REPAIRED', 'SOLD', 'SCRAPPED', 'INTER', 'PENDING'];

export default function FleetTable({ data, onUpdate, onDelete, updatedRowIds, hiddenColumns }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  const columnHelper = createColumnHelper<FleetRecord>();

  const columns = useMemo(() => [
    columnHelper.accessor('fleet_type', {
      header: 'Type',
      size: 80,
      minSize: 60,
      cell: ({ row, getValue }) => (
        <InlineEdit
          value={getValue()}
          field="fleet_type"
          type="select"
          options={['ELECTRICAL', 'DIESEL']}
          onSave={(f, v) => onUpdate(row.original.id, f, v)}
        />
      ),
    }),
    columnHelper.accessor('veh_no', {
      header: 'Veh No',
      size: 80,
      minSize: 60,
      cell: ({ getValue }) => (
        <span className="font-mono font-semibold text-blue-700">{getValue()}</span>
      ),
    }),
    columnHelper.accessor('brand', {
      header: 'Brand',
      size: 90,
      minSize: 60,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="brand" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('model', {
      header: 'Model',
      size: 160,
      minSize: 80,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="model" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      size: 80,
      minSize: 60,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="category" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('condition', {
      header: 'Condition',
      size: 100,
      minSize: 70,
      cell: ({ row, getValue }) => (
        <InlineEdit
          value={getValue()}
          field="condition"
          type="select"
          options={CONDITIONS}
          onSave={(f, v) => onUpdate(row.original.id, f, v)}
        />
      ),
    }),
    columnHelper.accessor('customer_name', {
      header: 'Customer',
      size: 160,
      minSize: 80,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="customer_name" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('salesman_name', {
      header: 'Salesman',
      size: 120,
      minSize: 70,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="salesman_name" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('chassis', {
      header: 'Chassis',
      size: 100,
      minSize: 60,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="chassis" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('mast', {
      header: 'Mast',
      size: 70,
      minSize: 50,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="mast" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('yor', {
      header: 'YOR',
      size: 55,
      minSize: 45,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="yor" type="number" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('yom', {
      header: 'YOM',
      size: 55,
      minSize: 45,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="yom" type="number" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('rental', {
      header: 'Rental',
      size: 55,
      minSize: 45,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="rental" type="checkbox" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('sales', {
      header: 'Sales',
      size: 55,
      minSize: 45,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="sales" type="checkbox" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('scrap', {
      header: 'Scrap',
      size: 55,
      minSize: 45,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="scrap" type="checkbox" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('remarks', {
      header: 'Remarks',
      size: 180,
      minSize: 80,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="remarks" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('location', {
      header: 'Location',
      size: 120,
      minSize: 60,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="location" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.accessor('replace_ref', {
      header: 'Replace',
      size: 70,
      minSize: 50,
      cell: ({ row, getValue }) => (
        <InlineEdit value={getValue()} field="replace_ref" onSave={(f, v) => onUpdate(row.original.id, f, v)} />
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      size: 40,
      minSize: 30,
      enableResizing: false,
      cell: ({ row }) => (
        <button
          onClick={() => {
            if (confirm(`Delete ${row.original.veh_no}?`)) {
              onDelete(row.original.id, row.original.veh_no);
            }
          }}
          className="text-red-400 hover:text-red-600 text-sm"
          title="Delete"
        >
          ✕
        </button>
      ),
    }),
  ], [columnHelper, onUpdate, onDelete]);

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => {
      // Display columns (like 'actions') have no accessorKey — always show them
      if (!('accessorKey' in col)) return true;
      return !hiddenColumns.includes(col.accessorKey as string);
    });
  }, [columns, hiddenColumns]);

  const table = useReactTable({
    data,
    columns: visibleColumns,
    state: { sorting },
    onSortingChange: setSorting,
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="text-sm" style={{ width: table.getCenterTotalSize() }}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-neutral-800 text-white">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="relative px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide select-none whitespace-nowrap group"
                    style={{ width: header.getSize() }}
                  >
                    <div
                      className="flex items-center gap-1 cursor-pointer hover:text-blue-300"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
                    </div>
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none
                          ${header.column.getIsResizing() ? 'bg-blue-400' : 'bg-neutral-600 opacity-0 group-hover:opacity-100'}
                        `}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-neutral-100 hover:bg-blue-50/50 ${
                  updatedRowIds.has(row.original.id) ? 'row-updated' : ''
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className="px-2 py-1.5 overflow-hidden"
                    style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-neutral-50 text-xs text-neutral-500 border-t border-neutral-200">
        {data.length} vehicles
      </div>
    </div>
  );
}
