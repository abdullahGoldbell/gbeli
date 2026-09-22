'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import AdminTabs from './admin/AdminTabs';
import UsersTab from './admin/UsersTab';
import ColumnAccessTab from './admin/ColumnAccessTab';
import { useAdminUsers } from './admin/useAdminUsers';
import { useUserForm } from './admin/useUserForm';
import { useColumnAccess } from './admin/useColumnAccess';
import type { AdminTab } from './admin/types';

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const { user: currentUser } = useAuth();
  const [tab, setTab] = useState<AdminTab>('users');
  const { users, loading, fetchUsers, deleteUser } = useAdminUsers();
  const form = useUserForm(fetchUsers);
  const access = useColumnAccess(users, fetchUsers);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#1e293b] border border-[#334155] rounded-xl w-[580px] max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
          <h2 className="text-lg font-bold text-[#f8fafc]">Admin Panel</h2>
          <button onClick={onClose} aria-label="Close" className="text-[#64748b] hover:text-white text-xl">✕</button>
        </div>

        {/* Tabs */}
        <AdminTabs tab={tab} onChange={setTab} />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'users' && (
            <UsersTab
              users={users}
              loading={loading}
              currentUserId={currentUser?.userId}
              form={form}
              onDelete={deleteUser}
            />
          )}

          {tab === 'columns' && <ColumnAccessTab users={users} access={access} />}
        </div>
      </div>
    </div>
  );
}
