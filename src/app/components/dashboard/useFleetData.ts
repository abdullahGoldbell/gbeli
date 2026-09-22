'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FleetRecord, FleetStats } from '@/lib/types';
import { EMPTY_FILTERS, FilterState, SEARCH_DEBOUNCE_MS } from './types';

function toParams(f: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(f)) {
    if (value) params.set(key, value);
  }
  return params;
}

/** Fleet rows + stats, filter state, and the debounced filter handler. */
export function useFleetData(ready: boolean) {
  const [data, setData] = useState<FleetRecord[]>([]);
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error(`Stats request failed (${res.status})`);
      setStats(await res.json());
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchData = useCallback(async (f?: FilterState) => {
    try {
      const res = await fetch(`/api/fleet?${toParams(f || filters)}`);
      if (!res.ok) throw new Error(`Fleet request failed (${res.status})`);
      setData(await res.json());
    } catch (err) {
      console.error('Failed to fetch fleet data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load — wait for auth to be ready
  useEffect(() => {
    if (!ready) return;
    fetchData();
    fetchStats();
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear any pending debounced search on unmount
  useEffect(() => () => clearTimeout(searchTimeoutRef.current), []);

  const handleFilterChange = useCallback((next: FilterState) => {
    setFilters(next);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => fetchData(next), SEARCH_DEBOUNCE_MS);
  }, [fetchData]);

  const applyFilters = useCallback((next: FilterState) => {
    setFilters(next);
    fetchData(next);
  }, [fetchData]);

  return { data, setData, stats, loading, filters, fetchData, fetchStats, handleFilterChange, applyFilters };
}
