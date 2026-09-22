'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserRecord } from './types';

export function useAdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const deleteUser = useCallback(
    async (id: number) => {
      if (!confirm('Delete this user?')) return;
      try {
        const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
        if (res.ok) fetchUsers();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    },
    [fetchUsers],
  );

  return { users, loading, fetchUsers, deleteUser };
}
