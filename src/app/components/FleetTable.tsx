'use client';

import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnResizeMode,
  PaginationState,
} from '@tanstack/react-table';
import { FleetRecord } from '@/lib/types';
import { useColumnOrder } from '@/lib/useColumnOrder';
import TablePagination from './TablePagination';
import { useFleetColumns } from './fleet-table/useFleetColumns';
import FleetTableHeader from './fleet-table/FleetTableHeader';
import FleetTableBody from './fleet-table/FleetTableBody';
import { PAGE_SIZE } from './fleet-table/constants';

interface Props {
  data: FleetRecord[];
  onUpdate: (id: number, field: string, value: string | number | boolean | null) => void;
  onDelete: (id: number, vehNo: string) => void;
  onStatusMove?: (row: FleetRecord, status: 'Out' | 'Sold') => void;
  updatedRowIds: Set<number>;
  hiddenColumns: string[];
  isAdmin: boolean;
}

export default function FleetTable({ data, onUpdate, onDelete, onStatusMove, updatedRowIds, hiddenColumns, isAdmin }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE });
  const [columnResizeMode] = useState<ColumnResizeMode>('onChange');

  const columns = useFleetColumns({ onUpdate, onDelete, onStatusMove, isAdmin });

  const visibleColumns = useMemo(() => {
    const hidden = new Set(hiddenColumns);
    return columns.filter((col) => {
      if (!('accessorKey' in col)) return true;
      return !hidden.has(col.accessorKey as string);
    });
  }, [columns, hiddenColumns]);

  const columnIds = useMemo(
    () => visibleColumns.map((col) => ('accessorKey' in col ? String(col.accessorKey) : String(col.id))),
    [visibleColumns],
  );

  const { order: columnOrder, dragProps, dragClass, reset: resetColumnOrder } = useColumnOrder(
    'fms.columnOrder.fleet',
    columnIds,
  );

  const table = useReactTable({
    data,
    columns: visibleColumns,
    state: { sorting, columnOrder, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    columnResizeMode,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
      <div className="px-4 py-2 flex justify-end border-b border-neutral-200">
        <button
          onClick={resetColumnOrder}
          className="text-xs text-neutral-500 hover:text-neutral-800"
          title="Reset column order"
        >
          ↔ Reset Columns
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm w-full" style={{ minWidth: table.getCenterTotalSize() }}>
          <FleetTableHeader table={table} dragProps={dragProps} dragClass={dragClass} />
          <FleetTableBody table={table} updatedRowIds={updatedRowIds} />
        </table>
      </div>
      <TablePagination
        page={pagination.pageIndex + 1}
        pageSize={PAGE_SIZE}
        totalRows={data.length}
        onPageChange={(page) => setPagination((current) => ({ ...current, pageIndex: page - 1 }))}
      />
    </div>
  );
}
