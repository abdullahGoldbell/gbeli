'use client';

import { FleetStats } from '@/lib/types';

interface Props {
  stats: FleetStats | null;
  onCardClick?: (filter: { fleet_type?: string; release_status?: string; reset?: boolean }) => void;
}

export default function StatsCards({ stats, onCardClick }: Props) {
  if (!stats) return <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 animate-pulse h-20" />
    ))}
  </div>;

  const cards: Array<{
    label: string;
    value: number;
    color: string;
    icon: string;
    filter: { fleet_type?: string; release_status?: string; reset?: boolean };
  }> = [
    { label: 'Total Fleet', value: stats.total, color: 'bg-blue-600', icon: '🚜', filter: { reset: true } },
    { label: 'Electrical', value: stats.electrical, color: 'bg-emerald-600', icon: '⚡', filter: { fleet_type: 'ELECTRICAL' } },
    { label: 'Diesel', value: stats.diesel, color: 'bg-amber-600', icon: '⛽', filter: { fleet_type: 'DIESEL' } },
    { label: 'OUT', value: stats.out ?? 0, color: 'bg-red-600', icon: '📤', filter: { release_status: 'OUT' } },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={() => onCardClick?.(card.filter)}
          className="text-left bg-white rounded-lg p-4 shadow-sm border border-neutral-200 hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{card.label}</span>
            <span className="text-lg">{card.icon}</span>
          </div>
          <div className={`text-2xl font-bold ${card.color.replace('bg-', 'text-')}`}>{card.value}</div>
        </button>
      ))}
    </div>
  );
}
