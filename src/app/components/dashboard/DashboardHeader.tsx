'use client';

import { AuthUser } from '@/lib/types';

interface Props {
  user: AuthUser | null;
  vehicleCount: number;
  onOpenAdmin: () => void;
  onLogout: () => void;
}

export default function DashboardHeader({ user, vehicleCount, onOpenAdmin, onLogout }: Props) {
  return (
    <header className="bg-neutral-900 text-white px-6 py-4 shadow-lg">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">FMS Fleet Dashboard</h1>
          <p className="text-neutral-400 text-sm">Fleet Management System &middot; {vehicleCount} vehicles</p>
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
                  onClick={onOpenAdmin}
                  className="text-neutral-400 hover:text-white transition-colors text-lg"
                  title="Admin Panel"
                >
                  ⚙
                </button>
              )}
              <button
                onClick={onLogout}
                className="text-xs text-neutral-400 hover:text-white border border-neutral-600 hover:border-neutral-400 px-2.5 py-1 rounded transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
