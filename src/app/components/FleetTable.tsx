'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnResizeMode,
  ColumnDef,
} from '@tanstack/react-table';
import { FleetRecord } from '@/lib/types';
import InlineEdit from './InlineEdit';

interface Props {
  data: FleetRecord[];
  onUpdate: (id: number, field: string, value: string | number | boolean | null) => void;
  onDelete: (id: number, vehNo: string) => void;
  updatedRowIds: Set<number>;
  hiddenColumns: string[];
  isAdmin: boolean;
}

const CONDITIONS = ['REPAIRING', 'PENDING QUOTATION', 'OK', 'PENDING PRE-DEPLOYMENT', 'PENDING POST-DEPLOYMENT', 'AWAITING FOR SPARES', 'CANIBALISED'];

function ReservationDateCell({ value, onSave }: { value: string | null; onSave: (date: string | null) => void }) {
  const formatted = value && value.includes('T') ? value.split('T')[0] : (value || '');
  const [editing, setEditing] = useState(false);
  const [dateVal, setDateVal] = useState(formatted);

  const handleOpen = useCallback(() => {
    setDateVal(formatted);
    setEditing(true);
  }, [formatted]);

  const handleConfirm = useCallback(() => {
    setEditing(false);
    if (dateVal !== formatted) {
      onSave(dateVal || null);
    }
  }, [dateVal, formatted, onSave]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setDateVal(formatted);
  }, [formatted]);

  if (!editing) {
    return (
      <div
        onClick={handleOpen}
        className="cursor-pointer min-h-[1.5em] px-1 py-0.5 rounded hover:bg-blue-50 truncate"
        title={formatted || 'Click to set date'}
      >
        {formatted || <span className="text-neutral-300">-</span>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={dateVal}
        onChange={(e) => setDateVal(e.target.value)}
        autoFocus
        className="flex-1 px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        onClick={handleConfirm}
        className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
        title="Save"
      >
        Save
      </button>
      <button
        onClick={handleCancel}
        className="px-1 py-0.5 text-neutral-400 hover:text-neutral-600 text-xs"
        title="Cancel"
      >
        ✕
      </button>
    </div>
  );
}
const RELEASE_STATUSES = ['Release', 'Hold'];

export default function FleetTable({ data, onUpdate, onDelete, updatedRowIds, hiddenColumns, isAdmin }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  const columnHelper = createColumnHelper<FleetRecord>();

  const columns = useMemo(() => {
    const ro = !isAdmin; // readOnly for non-admin

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cols: ColumnDef<FleetRecord, any>[] = [
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
            readOnly={ro}
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
          <InlineEdit value={getValue()} field="brand" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('model', {
        header: 'Model',
        size: 160,
        minSize: 80,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="model" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('model2', {
        header: 'Model 2',
        size: 120,
        minSize: 70,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="model2" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
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
            readOnly={ro}
            onSave={(f, v) => onUpdate(row.original.id, f, v)}
          />
        ),
      }),
      columnHelper.accessor('release_status', {
        header: 'Status',
        size: 90,
        minSize: 70,
        cell: ({ row, getValue }) => (
          <InlineEdit
            value={getValue()}
            field="release_status"
            type="select"
            options={RELEASE_STATUSES}
            readOnly={ro}
            onSave={(f, v) => onUpdate(row.original.id, f, v)}
          />
        ),
      }),
      columnHelper.accessor('reservation_date', {
        header: 'Reservation',
        size: 200,
        minSize: 150,
        cell: ({ row, getValue }) => (
          <ReservationDateCell
            value={getValue()}
            onSave={(date) => onUpdate(row.original.id, 'reservation_date', date)}
          />
        ),
      }),
      columnHelper.accessor('reserved_by', {
        header: 'Reserved By',
        size: 120,
        minSize: 80,
        cell: ({ row, getValue }) => {
          if (isAdmin) {
            return (
              <InlineEdit value={getValue()} field="reserved_by" readOnly={false} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
            );
          }
          const val = getValue();
          return (
            <div className="min-h-[1.5em] px-1 py-0.5 truncate text-neutral-600">
              {val || <span className="text-neutral-300">-</span>}
            </div>
          );
        },
      }),
      columnHelper.accessor('customer_name', {
        header: 'Customer',
        size: 160,
        minSize: 80,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="customer_name" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('salesman_name', {
        header: 'Salesman',
        size: 120,
        minSize: 70,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="salesman_name" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('chassis', {
        header: 'Chassis',
        size: 100,
        minSize: 60,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="chassis" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('mast', {
        header: 'Mast',
        size: 70,
        minSize: 50,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="mast" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('yor', {
        header: 'YOR',
        size: 55,
        minSize: 45,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="yor" type="number" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('yom', {
        header: 'YOM',
        size: 55,
        minSize: 45,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="yom" type="number" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('remarks', {
        header: 'Remarks',
        size: 180,
        minSize: 80,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="remarks" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        size: 120,
        minSize: 60,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="location" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
      columnHelper.accessor('replace_ref', {
        header: 'Name',
        size: 70,
        minSize: 50,
        cell: ({ row, getValue }) => (
          <InlineEdit value={getValue()} field="replace_ref" readOnly={ro} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        ),
      }),
    ];

    // Only show delete button for admin users
    if (isAdmin) {
      cols.push(
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
      );
    }

    return cols;
  }, [columnHelper, onUpdate, onDelete, isAdmin]);

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
        <table className="text-sm w-full" style={{ minWidth: table.getCenterTotalSize() }}>
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
