'use client';

import ColumnAccessEditor from './ColumnAccessEditor';
import type { useColumnAccess } from './useColumnAccess';
import type { UserRecord } from './types';

interface ColumnAccessTabProps {
  users: UserRecord[];
  access: ReturnType<typeof useColumnAccess>;
}

export default function ColumnAccessTab({ users, access }: ColumnAccessTabProps) {
  return (
    <div>
      {/* User selector */}
      <div className="mb-4">
        <label htmlFor="admin-columns-user" className="block text-xs text-[#94a3b8] mb-1.5">Select User</label>
        <select
          id="admin-columns-user"
          value={access.selectedUserId || ''}
          onChange={(e) => access.selectUserById(e.target.value)}
          className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-primary"
        >
          <option value="">Choose a user...</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.username}{u.displayName ? ` (${u.displayName})` : ''}
            </option>
          ))}
        </select>
      </div>

      {access.selectedUserId && (
        <ColumnAccessEditor
          hiddenCols={access.hiddenCols}
          saving={access.savingCols}
          message={access.colSaveMsg}
          onToggle={access.toggleColumn}
          onShowAll={access.showAllColumns}
          onHideAll={access.hideAllColumns}
          onSave={access.saveColumnAccess}
        />
      )}
    </div>
  );
}
