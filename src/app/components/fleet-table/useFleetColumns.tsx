'use client';

import { useMemo } from 'react';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';
import { FleetRecord } from '@/lib/types';
import InlineEdit from '../InlineEdit';
import ReservationDateCell from './ReservationDateCell';
import ReleaseStatusCell from './ReleaseStatusCell';
import DeleteActionCell from './DeleteActionCell';
import { CONDITIONS, LEASE_PERIODS } from './constants';

export type FleetUpdateHandler = (id: number, field: string, value: string | number | boolean | null) => void;
export type FleetDeleteHandler = (id: number, vehNo: string) => void;
export type FleetStatusMoveHandler = (row: FleetRecord, status: 'Out' | 'Sold') => void;

interface Options {
  onUpdate: FleetUpdateHandler;
  onDelete: FleetDeleteHandler;
  onStatusMove?: FleetStatusMoveHandler;
  isAdmin: boolean;
}

type EditableKey = Exclude<keyof FleetRecord, 'id'>;

interface EditableSpec {
  key: EditableKey;
  header: string;
  size: number;
  minSize: number;
  type?: 'select' | 'number';
  options?: string[];
  /** When set, overrides the default read-only flag derived from isAdmin. */
  readOnly?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FleetColumn = ColumnDef<FleetRecord, any>;

const columnHelper = createColumnHelper<FleetRecord>();

const inDateCell = (v: string | null) => v ? (v.includes('T') ? v.split('T')[0] : v) : '';

const LEADING_EDITABLE: EditableSpec[] = [
  { key: 'fleet_type', header: 'Type', size: 80, minSize: 60, type: 'select', options: ['ELECTRICAL', 'DIESEL'] },
  { key: 'category', header: 'Category', size: 120, minSize: 80 },
];

const MIDDLE_EDITABLE: EditableSpec[] = [
  { key: 'brand', header: 'Brand', size: 100, minSize: 60 },
  { key: 'model', header: 'Model', size: 160, minSize: 80 },
  { key: 'name', header: 'Name', size: 100, minSize: 60 },
];

const TRAILING_EDITABLE: EditableSpec[] = [
  { key: 'container_mast', header: 'Closed Mast', size: 110, minSize: 70 },
  { key: 'chassis', header: 'Chassis', size: 110, minSize: 70 },
  { key: 'mast', header: 'Mast', size: 100, minSize: 60 },
  { key: 'attachment', header: 'Att', size: 80, minSize: 50 },
  { key: 'yor', header: 'YOR', size: 60, minSize: 45, type: 'number' },
  { key: 'yom', header: 'YOM', size: 60, minSize: 45, type: 'number' },
  { key: 'customer_name', header: 'Customer', size: 160, minSize: 80 },
  { key: 'lease_period', header: 'Lease Period', size: 120, minSize: 90, type: 'select', options: LEASE_PERIODS, readOnly: false },
  { key: 'condition', header: 'Condition', size: 130, minSize: 70, type: 'select', options: CONDITIONS },
  { key: 'supplier', header: 'Supplier', size: 110, minSize: 60 },
  { key: 'remarks', header: 'Remarks', size: 220, minSize: 100 },
  { key: 'lta_reg', header: 'LTA Reg', size: 110, minSize: 60 },
];

function editableColumn(spec: EditableSpec, ro: boolean, onUpdate: FleetUpdateHandler): FleetColumn {
  const readOnly = spec.readOnly ?? ro;
  return columnHelper.accessor(spec.key, {
    header: spec.header, size: spec.size, minSize: spec.minSize,
    cell: ({ row, getValue }) => (
      <InlineEdit value={getValue()} field={spec.key} type={spec.type} options={spec.options} readOnly={readOnly} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
    ),
  });
}

function inDateColumn(isAdmin: boolean, onUpdate: FleetUpdateHandler): FleetColumn {
  return columnHelper.accessor('in_out_date', {
    header: 'In Date', size: 100, minSize: 80,
    cell: ({ row, getValue }) => (
      isAdmin
        ? <InlineEdit value={getValue()} field="in_out_date" type="date" readOnly={false} onSave={(f, v) => onUpdate(row.original.id, f, v)} />
        : <span className="text-neutral-700">{inDateCell(getValue())}</span>
    ),
  });
}

const vehNoColumn: FleetColumn = columnHelper.accessor('veh_no', {
  header: 'Veh No', size: 90, minSize: 60,
  cell: ({ getValue }) => <span className="font-mono font-semibold text-primary-accessible">{getValue()}</span>,
});

function releaseStatusColumn(ro: boolean, onUpdate: FleetUpdateHandler, onStatusMove?: FleetStatusMoveHandler): FleetColumn {
  return columnHelper.accessor('release_status', {
    header: 'Status', size: 90, minSize: 70,
    cell: ({ row, getValue }) => (
      <ReleaseStatusCell row={row.original} value={getValue()} readOnly={ro} onUpdate={onUpdate} onStatusMove={onStatusMove} />
    ),
  });
}

function reservationColumns(isAdmin: boolean, onUpdate: FleetUpdateHandler): FleetColumn[] {
  return [
    columnHelper.accessor('reservation_date', {
      header: 'Reservation', size: 200, minSize: 150,
      cell: ({ row, getValue }) => (
        <ReservationDateCell value={getValue()} isAdmin={isAdmin} onSave={(date) => onUpdate(row.original.id, 'reservation_date', date)} />
      ),
    }),
    columnHelper.accessor('reserved_by', {
      header: 'Reserved By', size: 120, minSize: 80,
      cell: ({ row, getValue }) => {
        if (isAdmin) {
          return <InlineEdit value={getValue()} field="reserved_by" readOnly={false} onSave={(f, v) => onUpdate(row.original.id, f, v)} />;
        }
        const val = getValue();
        return <div className="min-h-[1.5em] px-1 py-0.5 truncate text-neutral-600">{val || <span className="text-neutral-300">-</span>}</div>;
      },
    }),
  ];
}

function actionsColumn(onDelete: FleetDeleteHandler): FleetColumn {
  return columnHelper.display({
    id: 'actions',
    header: '',
    size: 40,
    minSize: 30,
    enableResizing: false,
    cell: ({ row }) => <DeleteActionCell row={row.original} onDelete={onDelete} />,
  });
}

/** TanStack column definitions for the fleet table, in display order. */
export function useFleetColumns({ onUpdate, onDelete, onStatusMove, isAdmin }: Options): FleetColumn[] {
  return useMemo(() => {
    const ro = !isAdmin;
    const cols: FleetColumn[] = [
      ...LEADING_EDITABLE.map((spec) => editableColumn(spec, ro, onUpdate)),
      inDateColumn(isAdmin, onUpdate),
      ...MIDDLE_EDITABLE.map((spec) => editableColumn(spec, ro, onUpdate)),
      vehNoColumn,
      ...TRAILING_EDITABLE.map((spec) => editableColumn(spec, ro, onUpdate)),
      releaseStatusColumn(ro, onUpdate, onStatusMove),
      ...reservationColumns(isAdmin, onUpdate),
    ];
    return isAdmin ? [...cols, actionsColumn(onDelete)] : cols;
  }, [onUpdate, onDelete, onStatusMove, isAdmin]);
}
