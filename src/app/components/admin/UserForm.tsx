'use client';

import type { UserFormData, UserRecord } from './types';

const INPUT_CLASS =
  'w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-primary';

interface UserFormProps {
  editingUser: UserRecord | null;
  formData: UserFormData;
  error: string;
  onChange: (patch: Partial<UserFormData>) => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function UserForm({ editingUser, formData, error, onChange, onCancel, onSave }: UserFormProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#f8fafc] mb-3">
        {editingUser ? `Edit: ${editingUser.username}` : 'Add User'}
      </h3>
      <div className="space-y-3">
        <div>
          <label htmlFor="admin-user-username" className="block text-xs text-[#94a3b8] mb-1">Username</label>
          <input
            id="admin-user-username"
            type="text"
            value={formData.username}
            onChange={(e) => onChange({ username: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="admin-user-password" className="block text-xs text-[#94a3b8] mb-1">
            Password{editingUser ? ' (leave blank to keep)' : ''}
          </label>
          <input
            id="admin-user-password"
            type="password"
            value={formData.password}
            onChange={(e) => onChange({ password: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="admin-user-display-name" className="block text-xs text-[#94a3b8] mb-1">Display Name</label>
          <input
            id="admin-user-display-name"
            type="text"
            value={formData.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            className={INPUT_CLASS}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.isAdmin}
            onChange={(e) => onChange({ isAdmin: e.target.checked })}
            className="rounded"
          />
          <span className="text-sm text-[#f8fafc]">Admin</span>
        </label>
      </div>
      {error && <p className="text-danger text-sm mt-3">{error}</p>}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-[#94a3b8] border border-[#334155] rounded-md hover:border-[#475569]"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 text-sm text-white bg-primary hover:bg-primary-dark rounded-md font-semibold"
        >
          {editingUser ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}
