'use client';

import { useMemo } from 'react';
import { FleetRecord } from '@/lib/types';
import Filters from '../Filters';
import FleetTable from '../FleetTable';
import { CellValue, FilterState } from './types';

interface Props {
  data: FleetRecord[];
  loading: boolean;
  filters: FilterState;
  isAdmin: boolean;
  hiddenColumns: string[];
  updatedRowIds: Set<number>;
  onFilterChange: (f: FilterState) => void;
  onAdd: () => void;
  onUpload: () => void;
  onUpdate: (id: number, field: string, value: CellValue) => Promise<void>;
  onDelete: (id: number, vehNo: string) => Promise<void>;
  onStatusMove: (row: FleetRecord, status: 'Out' | 'Sold') => void;
}

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter(Boolean) as string[])].sort();
}

export default function FleetView(props: Props) {
  const { data, loading, filters, isAdmin, hiddenColumns, updatedRowIds } = props;
  const { onFilterChange, onAdd, onUpload, onUpdate, onDelete, onStatusMove } = props;

  const brands = useMemo(() => uniqueSorted(data.map((r) => r.brand)), [data]);
  const categories = useMemo(() => uniqueSorted(data.map((r) => r.category)), [data]);
  const conditions = useMemo(() => uniqueSorted(data.map((r) => r.condition)), [data]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.fleet_type) params.set('fleet_type', filters.fleet_type);
    window.open(`/api/export?${params}`, '_blank');
  };

  return (
    <>
      <Filters
        filters={filters}
        onFilterChange={onFilterChange}
        brands={brands}
        categories={categories}
        conditions={conditions}
        onExport={handleExport}
        onAdd={onAdd}
        onUpload={onUpload}
        showAdd={isAdmin}
        showExport={isAdmin}
        showStatusFilter={isAdmin}
      />
      {loading ? (
        <div className="bg-white rounded-lg p-12 text-center text-neutral-400">
          Loading fleet data...
        </div>
      ) : (
        <FleetTable
          data={data}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onStatusMove={onStatusMove}
          updatedRowIds={updatedRowIds}
          hiddenColumns={hiddenColumns}
          isAdmin={isAdmin}
        />
      )}
    </>
  );
}
