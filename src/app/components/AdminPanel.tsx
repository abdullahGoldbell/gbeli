'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthProvider';

interface UserRecord {
  id: number;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  createdAt: string;
  hiddenColumns: string[];
}

const COLUMN_GROUPS = [
  {
    label: 'Table Columns (in order)',
    columns: [
      { key: 'fleet_type', label: 'Type' },
      { key: 'veh_no', label: 'Veh No' },
      { key: 'brand', label: 'Brand' },
      { key: 'model', label: 'Model' },
      { key: 'category', label: 'Category' },
      { key: 'condition', label: 'Condition' },
      { key: 'release_status', label: 'Status' },
      { key: 'reservation_date', label: 'Reservation' },
      { key: 'reserved_by', label: 'Reserved By' },
      { key: 'customer_name', label: 'Customer' },
      { key: 'salesman_name', label: 'Salesman' },
      { key: 'chassis', label: 'Chassis' },
      { key: 'mast', label: 'Mast' },
      { key: 'yor', label: 'YOR' },
      { key: 'yom', label: 'YOM' },
      { key: 'remarks', label: 'Remarks' },
      { key: 'location', label: 'Location' },
      { key: 'replace_ref', label: 'Name' },
    ],
  },
  {
    label: 'Additional Columns',
    columns: [
      { key: 'model2', label: 'Model 2' },
      { key: 'container_mast', label: 'Container/Mast' },
      { key: 'attachment', label: 'Attachment' },
      { key: 'battery', label: 'Battery' },
      { key: 'lta_reg', label: 'LTA Reg' },
      { key: 'postal_code', label: 'Postal Code' },
      { key: 'volts', label: 'Volts' },
      { key: 'equipment_type', label: 'Equipment Type' },
      { key: 'serviceable', label: 'Serviceable' },
      { key: 'repair_cost', label: 'Repair Cost' },
      { key: 'customer_requirements', label: 'Customer Req.' },
      { key: 'in_out_date', label: 'In/Out Date' },
    ],
  },
];

const ALL_COLUMN_KEYS = COLUMN_GROUPS.flatMap((g) => g.columns.map((c) => c.key));

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const { user: currentUser, refreshUser } = useAuth();
  const [tab, setTab] = useState<'users' | 'columns'>('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // User form state
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ username: '', password: '', displayName: '', isAdmin: false });

  // Column access state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [savingCols, setSavingCols] = useState(false);

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

  const handleSaveUser = async () => {
    setError('');
    const url = editingUser ? `/api/admin/users/${editingUser.id}` : '/api/admin/users';
    const method = editingUser ? 'PUT' : 'POST';
    const body: Record<string, unknown> = {
      username: formData.username,
      displayName: formData.displayName || null,
      isAdmin: formData.isAdmin,
    };
    if (formData.password) body.password = formData.password;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', displayName: '', isAdmin: false });
      fetchUsers();
    } catch {
      setError('Network error');
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) fetchUsers();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const openEditForm = (u: UserRecord) => {
    setEditingUser(u);
    setFormData({ username: u.username, password: '', displayName: u.displayName || '', isAdmin: u.isAdmin });
    setShowForm(true);
    setError('');
  };

  const openAddForm = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', displayName: '', isAdmin: false });
    setShowForm(true);
    setError('');
  };

  const selectUserForColumns = (u: UserRecord) => {
    setSelectedUserId(u.id);
    setHiddenCols(new Set(u.hiddenColumns));
  };

  const toggleColumn = (key: string) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const [colSaveMsg, setColSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
        fetchUsers();
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

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-[#1e293b] border border-[#334155] rounded-xl w-[580px] max-h-[80vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#334155]">
          <h2 className="text-lg font-bold text-[#f8fafc]">Admin Panel</h2>
          <button onClick={onClose} className="text-[#64748b] hover:text-white text-xl">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#334155]">
          <button
            onClick={() => setTab('users')}
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
              tab === 'users'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setTab('columns')}
            className={`px-5 py-3 text-sm font-semibold transition-colors ${
              tab === 'columns'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-[#64748b] hover:text-[#94a3b8]'
            }`}
          >
            Column Access
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'users' && (
            <>
              {loading ? (
                <p className="text-[#64748b] text-sm">Loading...</p>
              ) : showForm ? (
                /* User Form */
                <div>
                  <h3 className="text-sm font-semibold text-[#f8fafc] mb-3">
                    {editingUser ? `Edit: ${editingUser.username}` : 'Add User'}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">
                        Password{editingUser ? ' (leave blank to keep)' : ''}
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#94a3b8] mb-1">Display Name</label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isAdmin}
                        onChange={(e) => setFormData({ ...formData, isAdmin: e.target.checked })}
                        className="rounded"
                      />
                      <span className="text-sm text-[#f8fafc]">Admin</span>
                    </label>
                  </div>
                  {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => { setShowForm(false); setError(''); }}
                      className="px-4 py-2 text-sm text-[#94a3b8] border border-[#334155] rounded-md hover:border-[#475569]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveUser}
                      className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md font-semibold"
                    >
                      {editingUser ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : (
                /* User List */
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
                          <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditForm(u)}
                          className="text-xs text-[#64748b] hover:text-[#f8fafc]"
                        >
                          Edit
                        </button>
                        {u.id !== currentUser?.userId && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={openAddForm}
                    className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-md"
                  >
                    + Add User
                  </button>
                </div>
              )}
            </>
          )}

          {tab === 'columns' && (
            <div>
              {/* User selector */}
              <div className="mb-4">
                <label className="block text-xs text-[#94a3b8] mb-1.5">Select User</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => {
                    const u = users.find((u) => u.id === parseInt(e.target.value));
                    if (u) selectUserForColumns(u);
                  }}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-md px-3 py-2 text-sm text-[#f8fafc] focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose a user...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username}{u.displayName ? ` (${u.displayName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedUserId && (
                <>
                  {/* Select all / Deselect all */}
                  <div className="flex gap-3 mb-3">
                    <button
                      onClick={() => setHiddenCols(new Set())}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setHiddenCols(new Set(ALL_COLUMN_KEYS))}
                      className="text-xs text-[#64748b] hover:text-[#94a3b8]"
                    >
                      Deselect All
                    </button>
                  </div>

                  {/* Column groups */}
                  {COLUMN_GROUPS.map((group) => (
                    <div key={group.label} className="mb-4">
                      <h4 className="text-[11px] text-[#64748b] uppercase tracking-wider mb-2">
                        {group.label}
                      </h4>
                      <div className="grid grid-cols-2 gap-1.5">
                        {group.columns.map((col) => {
                          const visible = !hiddenCols.has(col.key);
                          return (
                            <label
                              key={col.key}
                              className="flex items-center gap-2 cursor-pointer py-1 px-2 rounded hover:bg-[#0f172a]"
                            >
                              <input
                                type="checkbox"
                                checked={visible}
                                onChange={() => toggleColumn(col.key)}
                                className="rounded"
                              />
                              <span className={`text-sm ${visible ? 'text-[#f8fafc]' : 'text-[#64748b] line-through'}`}>
                                {col.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {colSaveMsg && (
                    <p className={`text-sm mt-2 ${colSaveMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {colSaveMsg.text}
                    </p>
                  )}

                  <button
                    onClick={saveColumnAccess}
                    disabled={savingCols}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-semibold py-2 rounded-md mt-2"
                  >
                    {savingCols ? 'Saving...' : 'Save Column Access'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
