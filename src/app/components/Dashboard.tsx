'use client';

import { useCallback, useState } from 'react';
import { FleetRecord } from '@/lib/types';
import StatsCards from './StatsCards';
import Notifications from './Notifications';
import { useAuth } from './AuthProvider';
import DashboardHeader from './dashboard/DashboardHeader';
import ViewTabs from './dashboard/ViewTabs';
import FleetView from './dashboard/FleetView';
import DashboardViews from './dashboard/DashboardViews';
import DashboardModals, { DashboardModal } from './dashboard/DashboardModals';
import { useFleetData } from './dashboard/useFleetData';
import { useFleetSocket } from './dashboard/useFleetSocket';
import { useFleetMutations } from './dashboard/useFleetMutations';
import { buildMoveModal } from './dashboard/moveModalConfig';
import { CardAction, CellValue, EMPTY_FILTERS, MoveModalState, ViewTab } from './dashboard/types';

export default function Dashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const isAdmin = !!user?.isAdmin;

  const fleet = useFleetData(!authLoading);
  const { data, setData, stats, loading, filters, fetchData, fetchStats } = fleet;
  const updatedRowIds = useFleetSocket({ isAdmin, setData, fetchStats });
  const { handleUpdate, submitMove, handleDelete, handleAdd } = useFleetMutations({ setData, fetchStats });

  const [modal, setModal] = useState<DashboardModal>(null);
  const [moveModal, setMoveModal] = useState<MoveModalState | null>(null);
  const [view, setView] = useState<ViewTab>('fleet');
  const closeModal = useCallback(() => setModal(null), []);
  const closeMoveModal = useCallback(() => setMoveModal(null), []);

  const handleStatusMove = useCallback((row: FleetRecord, status: 'Out' | 'Sold') => {
    setMoveModal(buildMoveModal(row, status, submitMove, closeMoveModal));
  }, [submitMove, closeMoveModal]);

  const handleStatsCardClick = useCallback((action: CardAction) => {
    if (action.kind === 'nav') {
      setView(action.tab);
      return;
    }
    setView('fleet');
    fleet.applyFilters(action.reset ? EMPTY_FILTERS : { ...EMPTY_FILTERS, ...action });
  }, [fleet]);

  const handleAddSubmit = useCallback(async (formData: Record<string, CellValue>) => {
    if (await handleAdd(formData)) setModal(null);
  }, [handleAdd]);

  const handleUploaded = useCallback(() => {
    fetchData();
    fetchStats();
  }, [fetchData, fetchStats]);

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
      <DashboardHeader user={user} vehicleCount={data.length} onOpenAdmin={() => setModal('admin')} onLogout={logout} />

      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {isAdmin && <StatsCards stats={stats} onCardClick={handleStatsCardClick} />}
        {isAdmin && <ViewTabs view={view} onChange={setView} />}
        <DashboardViews
          view={view}
          isAdmin={isAdmin}
          onChanged={fetchStats}
          fleetView={
            <FleetView
              data={data}
              loading={loading}
              filters={filters}
              isAdmin={isAdmin}
              hiddenColumns={user?.hiddenColumns || []}
              updatedRowIds={updatedRowIds}
              onFilterChange={fleet.handleFilterChange}
              onAdd={() => setModal('add')}
              onUpload={() => setModal('upload')}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onStatusMove={handleStatusMove}
            />
          }
        />
      </main>

      <DashboardModals
        modal={modal}
        moveModal={moveModal}
        existing={data}
        onClose={closeModal}
        onCloseMove={closeMoveModal}
        onAdd={handleAddSubmit}
        onUploaded={handleUploaded}
      />
    </div>
  );
}
