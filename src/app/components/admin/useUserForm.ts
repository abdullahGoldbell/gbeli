'use client';

import { useState } from 'react';
import { EMPTY_USER_FORM, type UserFormData, type UserRecord } from './types';

function buildSaveBody(formData: UserFormData): Record<string, unknown> {
  const body: Record<string, unknown> = {
    username: formData.username,
    displayName: formData.displayName || null,
    isAdmin: formData.isAdmin,
  };
  return formData.password ? { ...body, password: formData.password } : body;
}

export function useUserForm(onSaved: () => void) {
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<UserFormData>(EMPTY_USER_FORM);
  const [error, setError] = useState('');

  const updateForm = (patch: Partial<UserFormData>) => {
    setFormData({ ...formData, ...patch });
  };

  const openEditForm = (u: UserRecord) => {
    setEditingUser(u);
    setFormData({ username: u.username, password: '', displayName: u.displayName || '', isAdmin: u.isAdmin });
    setShowForm(true);
    setError('');
  };

  const openAddForm = () => {
    setEditingUser(null);
    setFormData(EMPTY_USER_FORM);
    setShowForm(true);
    setError('');
  };

  const closeForm = () => {
    setShowForm(false);
    setError('');
  };

  const saveUser = async () => {
    setError('');
    const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
    const method = editingUser ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildSaveBody(formData)),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData(EMPTY_USER_FORM);
      onSaved();
    } catch {
      setError('Network error');
    }
  };

  return { editingUser, showForm, formData, error, updateForm, openEditForm, openAddForm, closeForm, saveUser };
}
