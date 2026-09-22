'use client';

import UserForm from './UserForm';
import UserList from './UserList';
import type { useUserForm } from './useUserForm';
import type { UserRecord } from './types';

interface UsersTabProps {
  users: UserRecord[];
  loading: boolean;
  currentUserId: number | undefined;
  form: ReturnType<typeof useUserForm>;
  onDelete: (id: number) => void;
}

export default function UsersTab({ users, loading, currentUserId, form, onDelete }: UsersTabProps) {
  if (loading) {
    return <p className="text-[#64748b] text-sm">Loading...</p>;
  }
  if (form.showForm) {
    return (
      <UserForm
        editingUser={form.editingUser}
        formData={form.formData}
        error={form.error}
        onChange={form.updateForm}
        onCancel={form.closeForm}
        onSave={form.saveUser}
      />
    );
  }
  return (
    <UserList
      users={users}
      currentUserId={currentUserId}
      onEdit={form.openEditForm}
      onDelete={onDelete}
      onAdd={form.openAddForm}
    />
  );
}
