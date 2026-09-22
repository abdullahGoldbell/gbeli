'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Sort column definitions to match a saved key order.
 * Columns absent from `order` keep their relative position at the end.
 */
export function applyOrder<T>(columns: T[], order: string[], keyOf: (c: T) => string): T[] {
  const index = new Map(order.map((k, i) => [k, i]));
  return [...columns].sort((a, b) => {
    const ai = index.get(keyOf(a)) ?? Number.MAX_SAFE_INTEGER;
    const bi = index.get(keyOf(b)) ?? Number.MAX_SAFE_INTEGER;
    return ai - bi;
  });
}

/**
 * Persisted, drag-and-drop column ordering shared by every list view.
 *
 * The order is stored in localStorage under a per-table key so each user keeps
 * their own arrangement across sessions. Column keys added to the app after an
 * order was saved are appended at the end rather than silently dropped.
 */
export function useColumnOrder(storageKey: string, defaultKeys: string[]) {
  const defaultsSignature = defaultKeys.join('|');
  const [order, setOrder] = useState<string[]>(defaultKeys);
  const [dragKey, setDragKey] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);

  // Load any saved order once on mount, reconciling against current columns.
  useEffect(() => {
    const defaults = defaultsSignature.split('|');
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return;
      }
      const saved: unknown = JSON.parse(raw);
      if (!Array.isArray(saved)) return;
      const defaultSet = new Set(defaults);
      const known = saved.filter((k): k is string => typeof k === 'string' && defaultSet.has(k));
      const knownSet = new Set(known);
      const missing = defaults.filter((k) => !knownSet.has(k));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrder([...known, ...missing]);
    } catch {
      // Corrupted entry — drop it; `order` already holds the defaults.
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Storage unavailable — nothing to clean up.
      }
    }
  }, [storageKey, defaultsSignature]);

  const persist = useCallback((next: string[]) => {
    setOrder(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Storage unavailable — keep the in-memory order.
    }
  }, [storageKey]);

  const moveColumn = useCallback((from: string, to: string) => {
    if (from === to) return;
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...order];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, from);
    persist(next);
  }, [order, persist]);

  const reset = useCallback(() => {
    persist(defaultsSignature.split('|'));
  }, [persist, defaultsSignature]);

  /** Spread onto a <th> to make it a drag handle and a drop target. */
  const dragProps = useCallback((key: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setDragKey(key);
      e.dataTransfer.effectAllowed = 'move';
      // Firefox requires data to be set for a drag to begin.
      e.dataTransfer.setData('text/plain', key);
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setOverKey((cur) => (cur === key ? cur : key));
    },
    onDragLeave: () => {
      setOverKey((cur) => (cur === key ? null : cur));
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const from = dragKey || e.dataTransfer.getData('text/plain');
      if (from) moveColumn(from, key);
      setDragKey(null);
      setOverKey(null);
    },
    onDragEnd: () => {
      setDragKey(null);
      setOverKey(null);
    },
  }), [dragKey, moveColumn]);

  /** Visual affordance for the dragged column and the current drop target. */
  const dragClass = useCallback((key: string) => {
    if (dragKey === key) return 'opacity-40';
    if (overKey === key) return 'bg-blue-600/40';
    return '';
  }, [dragKey, overKey]);

  return { order, setOrder: persist, moveColumn, reset, dragProps, dragClass };
}

/** Memoised ordering of column definitions for use inside components. */
export function useOrderedColumns<T>(columns: T[], order: string[], keyOf: (c: T) => string): T[] {
  return useMemo(
    () => applyOrder(columns, order, keyOf),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, order],
  );
}
