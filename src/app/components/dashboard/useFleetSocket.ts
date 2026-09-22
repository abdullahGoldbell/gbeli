'use client';

import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { FleetRecord } from '@/lib/types';
import { getSocket } from '@/lib/socket';
import { showToast } from '@/lib/toast';
import { HIGHLIGHT_MS } from './types';

interface Options {
  isAdmin: boolean;
  setData: Dispatch<SetStateAction<FleetRecord[]>>;
  fetchStats: () => void;
}

function upsert(prev: FleetRecord[], record: FleetRecord): FleetRecord[] {
  const exists = prev.some((r) => r.id === record.id);
  if (exists) return prev.map((r) => (r.id === record.id ? record : r));
  // Record became visible (e.g. changed to Release)
  return [...prev, record];
}

/** Subscribes to real-time fleet events; returns ids to highlight briefly. */
export function useFleetSocket({ isAdmin, setData, fetchStats }: Options) {
  const [updatedRowIds, setUpdatedRowIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const socket = getSocket();
    const visible = (record: FleetRecord) => isAdmin || record.release_status === 'Release';

    const onUpdated = (record: FleetRecord) => {
      if (!visible(record)) {
        setData((prev) => prev.filter((r) => r.id !== record.id));
        return;
      }
      setData((prev) => upsert(prev, record));
      setUpdatedRowIds((prev) => new Set(prev).add(record.id));
      showToast(`${record.veh_no} updated${record.updated_by ? ` by ${record.updated_by}` : ''}`, 'info');
      fetchStats();
    };

    const onCreated = (record: FleetRecord) => {
      if (!visible(record)) return;
      setData((prev) => [...prev, record]);
      showToast(`${record.veh_no} added to fleet`, 'success');
      fetchStats();
    };

    const onDeleted = (record: FleetRecord) => {
      setData((prev) => prev.filter((r) => r.id !== record.id));
      showToast(`${record.veh_no} removed from fleet`, 'warning');
      fetchStats();
    };

    socket.on('fleet:updated', onUpdated);
    socket.on('fleet:created', onCreated);
    socket.on('fleet:deleted', onDeleted);
    return () => {
      socket.off('fleet:updated', onUpdated);
      socket.off('fleet:created', onCreated);
      socket.off('fleet:deleted', onDeleted);
    };
  }, [fetchStats, isAdmin, setData]);

  // Clear row highlights shortly after the latest real-time update
  useEffect(() => {
    if (updatedRowIds.size === 0) return;
    const timer = setTimeout(() => setUpdatedRowIds(new Set()), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [updatedRowIds]);

  return updatedRowIds;
}
