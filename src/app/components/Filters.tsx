'use client';

import { useCallback } from 'react';

interface FilterState {
  fleet_type: string;
  condition: string;
  brand: string;
  category: string;
  search: string;
  release_status: string;
}

interface Props {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  brands: string[];
  categories: string[];
  conditions: string[];
  onExport: () => void;
  onAdd: () => void;
  onUpload: () => void;
  showAdd?: boolean;
  showExport?: boolean;
  showStatusFilter?: boolean;
}

export default function Filters({ filters, onFilterChange, brands, categories, conditions, onExport, onAdd, onUpload, showAdd = true, showExport = true, showStatusFilter = true }: Props) {
  const update = useCallback((key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search vehicle, customer, model..."
          value={filters.search}
          onChange={(e) => update('search', e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        <select
          value={filters.fleet_type}
          onChange={(e) => update('fleet_type', e.target.value)}
          className="px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="ELECTRICAL">Electrical</option>
          <option value="DIESEL">Diesel</option>
        </select>

        <select
          value={filters.condition}
          onChange={(e) => update('condition', e.target.value)}
          className="px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Conditions</option>
          {conditions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={filters.brand}
          onChange={(e) => update('brand', e.target.value)}
          className="px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        <select
          value={filters.category}
          onChange={(e) => update('category', e.target.value)}
          className="px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {showStatusFilter && (
          <select
            value={filters.release_status}
            onChange={(e) => update('release_status', e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Release">Release</option>
            <option value="Hold">Hold</option>
          </select>
        )}

        <button
          onClick={() => onFilterChange({ fleet_type: '', condition: '', brand: '', category: '', search: '', release_status: '' })}
          className="px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900 border border-neutral-300 rounded-md hover:bg-neutral-50"
        >
          Clear
        </button>

        <div className="flex-1" />

        {showAdd && (
          <>
            <button
              onClick={onUpload}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-md hover:bg-violet-700 transition-colors"
            >
              &#8593; Upload Excel
            </button>
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              + Add Vehicle
            </button>
          </>
        )}

        {showExport && (
          <button
            onClick={onExport}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 transition-colors"
          >
            Export Excel
          </button>
        )}
      </div>
    </div>
  );
}
