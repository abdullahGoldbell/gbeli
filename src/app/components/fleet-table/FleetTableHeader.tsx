'use client';

import { flexRender, Header, Table } from '@tanstack/react-table';
import { FleetRecord } from '@/lib/types';
import { useColumnOrder } from '@/lib/useColumnOrder';

type DragProps = ReturnType<typeof useColumnOrder>['dragProps'];
type DragClass = ReturnType<typeof useColumnOrder>['dragClass'];

interface Props {
  table: Table<FleetRecord>;
  dragProps: DragProps;
  dragClass: DragClass;
}

function SortToggle({ header }: { header: Header<FleetRecord, unknown> }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 cursor-pointer hover:text-blue-300"
      onClick={header.column.getToggleSortingHandler()}
    >
      <span className="text-neutral-500">⋮⋮</span>
      {flexRender(header.column.columnDef.header, header.getContext())}
      {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? ''}
    </button>
  );
}

function ResizeHandle({ header }: { header: Header<FleetRecord, unknown> }) {
  return (
    <div
      role="presentation"
      onMouseDown={header.getResizeHandler()}
      onTouchStart={header.getResizeHandler()}
      onDragStart={(e) => e.preventDefault()}
      className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none ${header.column.getIsResizing() ? 'bg-blue-400' : 'bg-neutral-600 opacity-0 group-hover:opacity-100'}`}
    />
  );
}

export default function FleetTableHeader({ table, dragProps, dragClass }: Props) {
  return (
    <thead>
      {table.getHeaderGroups().map((headerGroup) => (
        <tr key={headerGroup.id} className="bg-neutral-800 text-white">
          {headerGroup.headers.map((header) => (
            <th
              key={header.id}
              {...dragProps(header.column.id)}
              className={`relative px-2 py-2.5 text-left text-xs font-semibold uppercase tracking-wide select-none whitespace-nowrap group cursor-move transition-colors ${dragClass(header.column.id)}`}
              style={{ width: header.getSize() }}
              title="Drag to reorder column"
            >
              <SortToggle header={header} />
              {header.column.getCanResize() && <ResizeHandle header={header} />}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  );
}
