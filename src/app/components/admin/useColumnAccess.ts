'use client';

import { useState } from 'react';
import { useAuth } from '../AuthProvider';
import { ALL_COLUMN_KEYS } from './columnGroups';
import type { ColumnSaveMessage, UserRecord } from './types';

function toggleInSet(prev: Set<string>, key: string): Set<string> {
  const next = new Set(prev);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

export function useColumnAccess(users: UserRecord[], onSaved: () => void) {
  const { user: currentUser, refreshUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [savingCols, setSavingCols] = useState(false);
  const [colSaveMsg, setColSaveMsg] = useState<ColumnSaveMessage | null>(null);

  const selectUserById = (rawId: string) => {
    const u = users.find((candidate) => candidate.id === parseInt(rawId));
    if (!u) return;
    setSelectedUserId(u.id);
    setHiddenCols(new Set(u.hiddenColumns));
  };

  const toggleColumn = (key: string) => {
    setHiddenCols((prev) => toggleInSet(prev, key));
  };

  const showAllColumns = () => setHiddenCols(new Set());
  const hideAllColumns = () => setHiddenCols(new Set(ALL_COLUMN_KEYS));

  const saveColumnAccess = async () => {
    if (!selectedUserId) return;
    setSavingCols(true);
    setColSaveMsg(null);
    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hiddenColumns: Array.from(hiddenCols) }),
      });
      if (res.ok) {
        onSaved();
        if (selectedUserId === currentUser?.userId) {
          await refreshUser();
        }
        setColSaveMsg({ type: 'success', text: 'Column access saved. User must re-login to see changes.' });
      } else {
        const data = await res.json();
        setColSaveMsg({ type: 'error', text: data.error || 'Failed to save column access' });
      }
    } catch (err) {
      console.error('Failed to save columns:', err);
      setColSaveMsg({ type: 'error', text: 'Network error saving column access' });
    } finally {
      setSavingCols(false);
    }
  };

  return {
    selectedUserId,
    hiddenCols,
    savingCols,
    colSaveMsg,
    selectUserById,
    toggleColumn,
    showAllColumns,
    hideAllColumns,
    saveColumnAccess,
  };
}
