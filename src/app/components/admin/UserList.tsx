'use client';

import type { UserRecord } from './types';

interface UserListProps {
  users: UserRecord[];
  currentUserId: number | undefined;
  onEdit: (u: UserRecord) => void;
  onDelete: (id: number) => void;
  onAdd: () => void;
}

export default function UserList({ users, currentUserId, onEdit, onDelete, onAdd }: UserListProps) {
  return (
    <div>
      {users.map((u) => (
        <div
          key={u.id}
          className="flex items-center justify-between py-2.5 border-b border-[#334155]/50"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#f8fafc] font-medium">{u.username}</span>
            {u.displayName && (
              <span className="text-xs text-[#64748b]">({u.displayName})</span>
            )}
            {u.isAdmin && (
              <span className="bg-primary text-gb-ink text-[10px] px-1.5 py-0.5 rounded font-semibold">
                ADMIN
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onEdit(u)}
              className="text-xs text-[#64748b] hover:text-[#f8fafc]"
            >
              Edit
            </button>
            {u.id !== currentUserId && (
              <button
                onClick={() => onDelete(u.id)}
                className="text-xs text-danger hover:text-danger/70"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
      <button
        onClick={onAdd}
        className="mt-4 w-full bg-primary hover:bg-primary-dark text-white text-sm font-semibold py-2 rounded-md"
      >
        + Add User
      </button>
    </div>
  );
}
