'use client';

import { FleetStats } from '@/lib/types';

type CardAction =
  | { kind: 'filter'; fleet_type?: string; reset?: boolean }
  | { kind: 'nav'; tab: 'out' | 'sold' | 'battery' };

interface Props {
  stats: FleetStats | null;
  onCardClick?: (action: CardAction) => void;
}

export default function StatsCards({ stats, onCardClick }: Props) {
  if (!stats) return <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-neutral-200 animate-pulse h-20" />
    ))}
  </div>;

  const fmt = (n: number) => n.toLocaleString();
  const fmtMoney = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const cards: Array<{
    label: string;
    value: number;
    sub?: string;
    color: string;
    icon: string;
    action: CardAction;
  }> = [
    { label: 'Total Fleet', value: stats.total, color: 'bg-blue-600', icon: '🚜', action: { kind: 'filter', reset: true } },
    { label: 'Electrical', value: stats.electrical, color: 'bg-emerald-600', icon: '⚡', action: { kind: 'filter', fleet_type: 'ELECTRICAL' } },
    { label: 'Diesel', value: stats.diesel, color: 'bg-amber-600', icon: '⛽', action: { kind: 'filter', fleet_type: 'DIESEL' } },
    { label: 'Out', value: stats.out ?? 0, color: 'bg-red-600', icon: '📤', action: { kind: 'nav', tab: 'out' } },
    { label: 'Sold', value: stats.sold ?? 0, color: 'bg-violet-600', icon: '💰', action: { kind: 'nav', tab: 'sold' } },
    { label: 'Battery Price', value: stats.battery ?? 0, sub: fmtMoney(stats.batterySum ?? 0), color: 'bg-cyan-600', icon: '🔋', action: { kind: 'nav', tab: 'battery' } },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {cards.map((card) => (
        <button
          key={card.label}
          type="button"
          onClick={() => onCardClick?.(card.action)}
          className="text-left bg-white rounded-lg p-4 shadow-sm border border-neutral-200 hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{card.label}</span>
            <span className="text-lg">{card.icon}</span>
          </div>
          <div className={`text-2xl font-bold ${card.color.replace('bg-', 'text-')}`}>{fmt(card.value)}</div>
          {card.sub && <div className="text-xs text-neutral-500 mt-1">Total {card.sub}</div>}
        </button>
      ))}
    </div>
  );
}
