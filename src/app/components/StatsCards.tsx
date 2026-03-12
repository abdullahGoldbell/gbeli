'use client';

import { FleetStats } from '@/lib/types';

interface Props {
  stats: FleetStats | null;
}

export default function StatsCards({ stats }: Props) {
  if (!stats) return <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
    {Array.from({ length: 7 }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 animate-pulse h-20" />
    ))}
  </div>;

  const cards = [
    { label: 'Total Fleet', value: stats.total, color: 'bg-blue-600', icon: '🚜' },
    { label: 'Electrical', value: stats.electrical, color: 'bg-emerald-600', icon: '⚡' },
    { label: 'Diesel', value: stats.diesel, color: 'bg-amber-600', icon: '⛽' },
    { label: 'In Repair', value: stats.inRepair, color: 'bg-red-600', icon: '🔧' },
    { label: 'On Rental', value: stats.onRental, color: 'bg-purple-600', icon: '📋' },
    { label: 'For Sale', value: stats.forSale, color: 'bg-cyan-600', icon: '💰' },
    { label: 'Scrapped', value: stats.scrapped, color: 'bg-neutral-600', icon: '🗑' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{card.label}</span>
            <span className="text-lg">{card.icon}</span>
          </div>
          <div className={`text-2xl font-bold ${card.color.replace('bg-', 'text-')}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
