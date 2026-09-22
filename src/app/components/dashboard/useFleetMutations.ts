'use client';

import { Dispatch, SetStateAction, useCallback } from 'react';
import { FleetRecord } from '@/lib/types';
import { getSocket } from '@/lib/socket';
import { showToast } from '@/lib/toast';
import { CellValue } from './types';

interface Options {
  setData: Dispatch<SetStateAction<FleetRecord[]>>;
  fetchStats: () => void;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function putFleet(id: number, body: Record<string, CellValue>) {
  const res = await fetch(`/api/fleet/${id}`, { method: 'PUT', headers: JSON_HEADERS, body: JSON.stringify(body) });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || 'Update failed');
  }
  return res.json();
}

/** Create / update / move / delete handlers that keep local rows in sync. */
export function useFleetMutations({ setData, fetchStats }: Options) {
  /** Apply a PUT result: rows that moved to Out/Sold leave the fleet list. */
  const applyPutResult = useCallback((id: number, result: FleetRecord & { moved?: boolean; to?: string }, emit: boolean) => {
    if (result.moved) {
      setData((prev) => prev.filter((r) => r.id !== id));
      showToast(`${result.veh_no} moved to ${result.to === 'sold' ? 'Sold' : 'Out'}`, 'success');
    } else {
      setData((prev) => prev.map((r) => (r.id === id ? result : r)));
      if (emit) getSocket().emit('fleet:updated', result);
    }
    fetchStats();
  }, [setData, fetchStats]);

  const handleUpdate = useCallback(async (id: number, field: string, value: CellValue) => {
    try {
      applyPutResult(id, await putFleet(id, { [field]: value }), true);
    } catch (err) {
      console.error('Update failed:', err);
      showToast('Failed to save change', 'warning');
    }
  }, [applyPutResult]);

  /** Status move (Out/Sold): errors propagate so the modal can display them. */
  const submitMove = useCallback(async (id: number, body: Record<string, string | null>) => {
    applyPutResult(id, await putFleet(id, body), false);
  }, [applyPutResult]);

  const handleDelete = useCallback(async (id: number, vehNo: string) => {
    try {
      const res = await fetch(`/api/fleet/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      const { deleted } = await res.json();
      setData((prev) => prev.filter((r) => r.id !== id));
      getSocket().emit('fleet:deleted', deleted);
      showToast(`${vehNo} deleted`, 'warning');
      fetchStats();
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Failed to delete', 'warning');
    }
  }, [setData, fetchStats]);

  const handleAdd = useCallback(async (formData: Record<string, CellValue>): Promise<boolean> => {
    try {
      const res = await fetch('/api/fleet', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(formData) });
      if (!res.ok) throw new Error('Create failed');
      const created = await res.json();
      setData((prev) => [...prev, created]);
      getSocket().emit('fleet:created', created);
      showToast(`${created.veh_no} added`, 'success');
      fetchStats();
      return true;
    } catch (err) {
      console.error('Create failed:', err);
      showToast('Failed to add vehicle', 'warning');
      return false;
    }
  }, [setData, fetchStats]);

  return { handleUpdate, submitMove, handleDelete, handleAdd };
}
