'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FleetRecord, FleetStats } from '@/lib/types';
import { getSocket } from '@/lib/socket';
import StatsCards from './StatsCards';
import Filters from './Filters';
import FleetTable from './FleetTable';
import Notifications, { showToast } from './Notifications';
import AddVehicleModal from './AddVehicleModal';
import UploadModal from './UploadModal';
import { useAuth } from './AuthProvider';
import AdminPanel from './AdminPanel';

interface FilterState {
  fleet_type: string;
  condition: string;
  brand: string;
  category: string;
  search: string;
}

export default function Dashboard() {
  const [data, setData] = useState<FleetRecord[]>([]);
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    fleet_type: '', condition: '', brand: '', category: '', search: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [updatedRowIds, setUpdatedRowIds] = useState<Set<number>>(new Set());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { user, loading: authLoading, logout } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const json = await res.json();
      setStats(json);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, []);

  const fetchData = useCallback(async (f?: FilterState) => {
    try {
      const active = f || filters;
      const params = new URLSearchParams();
      if (active.fleet_type) params.set('fleet_type', active.fleet_type);
      if (active.condition) params.set('condition', active.condition);
      if (active.brand) params.set('brand', active.brand);
      if (active.category) params.set('category', active.category);
      if (active.search) params.set('search', active.search);

      const res = await fetch(`/api/fleet?${params}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error('Failed to fetch fleet data:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial load — wait for auth to be ready
  useEffect(() => {
    if (!authLoading) {
      fetchData();
      fetchStats();
    }
  }, [authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket();

    socket.on('fleet:updated', (record: FleetRecord) => {
      // Non-admin: only show Release vehicles
      if (!user?.isAdmin && record.release_status !== 'Release') {
        setData((prev) => prev.filter((r) => r.id !== record.id));
        return;
      }
      setData((prev) => {
        const exists = prev.some((r) => r.id === record.id);
        if (exists) return prev.map((r) => (r.id === record.id ? record : r));
        // Record became visible (e.g. changed to Release)
        return [...prev, record];
      });
      setUpdatedRowIds((prev) => new Set(prev).add(record.id));
      setTimeout(() => {
        setUpdatedRowIds((prev) => {
          const next = new Set(prev);
          next.delete(record.id);
          return next;
        });
      }, 2000);
      showToast(`${record.veh_no} updated${record.updated_by ? ` by ${record.updated_by}` : ''}`, 'info');
      fetchStats();
    });

    socket.on('fleet:created', (record: FleetRecord) => {
      // Non-admin: only show Release vehicles
      if (!user?.isAdmin && record.release_status !== 'Release') return;
      setData((prev) => [...prev, record]);
      showToast(`${record.veh_no} added to fleet`, 'success');
      fetchStats();
    });

    socket.on('fleet:deleted', (record: FleetRecord) => {
      setData((prev) => prev.filter((r) => r.id !== record.id));
      showToast(`${record.veh_no} removed from fleet`, 'warning');
      fetchStats();
    });

    return () => {
      socket.off('fleet:updated');
      socket.off('fleet:created');
      socket.off('fleet:deleted');
    };
  }, [fetchStats, user?.isAdmin]);

  // Filter change with debounce for search
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchData(newFilters);
    }, 300);
  }, [fetchData]);

  // Update handler
  const handleUpdate = useCallback(async (id: number, field: string, value: string | number | boolean | null) => {
    try {
      const res = await fetch(`/api/fleet/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error('Update failed');
      const updated = await res.json();
      setData((prev) => prev.map((r) => (r.id === id ? updated : r)));
      getSocket().emit('fleet:updated', updated);
      fetchStats();
    } catch (err) {
      console.error('Update failed:', err);
      showToast('Failed to save change', 'warning');
    }
  }, [fetchStats]);

  // Delete handler
  const handleDelete = useCallback(async (id: number, vehNo: string) => {
    try {
      const res = await fetch(`/api/fleet/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      const { deleted } = await res.json();
      setData((prev) => prev.filter((r) => r.id !== id));
      getSocket().emit('fleet:deleted', deleted);
      showToast(`${vehNo} deleted`, 'warning');
      fetchStats();
    } catch (err) {
      console.error('Delete failed:', err);
      showToast('Failed to delete', 'warning');
    }
  }, [fetchStats]);

  // Add handler
  const handleAdd = useCallback(async (formData: Record<string, string | number | boolean | null>) => {
    try {
      const res = await fetch('/api/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Create failed');
      const created = await res.json();
      setData((prev) => [...prev, created]);
      getSocket().emit('fleet:created', created);
      setShowAddModal(false);
      showToast(`${created.veh_no} added`, 'success');
      fetchStats();
    } catch (err) {
      console.error('Create failed:', err);
      showToast('Failed to add vehicle', 'warning');
    }
  }, [fetchStats]);

  // Extract unique filter options from data
  const brands = [...new Set(data.map((r) => r.brand).filter(Boolean) as string[])].sort();
  const categories = [...new Set(data.map((r) => r.category).filter(Boolean) as string[])].sort();
  const conditions = [...new Set(data.map((r) => r.condition).filter(Boolean) as string[])].sort();

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.fleet_type) params.set('fleet_type', filters.fleet_type);
    window.open(`/api/export?${params}`, '_blank');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Notifications />

      {/* Header */}
      <header className="bg-neutral-900 text-white px-6 py-4 shadow-lg">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">FMS Fleet Dashboard</h1>
            <p className="text-neutral-400 text-sm">Fleet Management System &middot; {data.length} vehicles</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-neutral-400">Live</span>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-300">{user.displayName || user.username}</span>
                {user.isAdmin && (
                  <button
                    onClick={() => setShowAdmin(true)}
                    className="text-neutral-400 hover:text-white transition-colors text-lg"
                    title="Admin Panel"
                  >
                    ⚙
                  </button>
                )}
                <button
                  onClick={logout}
                  className="text-xs text-neutral-400 hover:text-white border border-neutral-600 hover:border-neutral-400 px-2.5 py-1 rounded transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        <StatsCards stats={stats} />
        <Filters
          filters={filters}
          onFilterChange={handleFilterChange}
          brands={brands}
          categories={categories}
          conditions={conditions}
          onExport={handleExport}
          onAdd={() => setShowAddModal(true)}
          onUpload={() => setShowUploadModal(true)}
          showAdd={!!user?.isAdmin}
        />
        {loading ? (
          <div className="bg-white rounded-lg p-12 text-center text-neutral-400">
            Loading fleet data...
          </div>
        ) : (
          <FleetTable data={data} onUpdate={handleUpdate} onDelete={handleDelete} updatedRowIds={updatedRowIds} hiddenColumns={user?.hiddenColumns || []} isAdmin={!!user?.isAdmin} />
        )}
      </main>

      {showAddModal && <AddVehicleModal onClose={() => setShowAddModal(false)} onSubmit={handleAdd} />}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            fetchData();
            fetchStats();
          }}
        />
      )}
      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
