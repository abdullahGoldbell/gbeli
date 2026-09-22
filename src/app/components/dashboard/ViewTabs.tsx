'use client';

import { ViewTab } from './types';

const TABS: { id: ViewTab; label: string }[] = [
  { id: 'fleet', label: 'Fleet' },
  { id: 'out', label: 'Out' },
  { id: 'sold', label: 'Sold' },
  { id: 'battery', label: 'Battery Price' },
];

const ACTIVE = 'bg-neutral-900 text-white';
const INACTIVE = 'bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50';

interface Props {
  view: ViewTab;
  onChange: (view: ViewTab) => void;
}

export default function ViewTabs({ view, onChange }: Props) {
  return (
    <div className="flex gap-2 mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${view === tab.id ? ACTIVE : INACTIVE}`}
        >{tab.label}</button>
      ))}
    </div>
  );
}
