'use client';

import type { AdminTab } from './types';

const TABS: { key: AdminTab; label: string }[] = [
  { key: 'users', label: 'Users' },
  { key: 'columns', label: 'Column Access' },
];

const ACTIVE_CLASS = 'text-blue-400 border-b-2 border-blue-400';
const INACTIVE_CLASS = 'text-[#64748b] hover:text-[#94a3b8]';

interface AdminTabsProps {
  tab: AdminTab;
  onChange: (tab: AdminTab) => void;
}

export default function AdminTabs({ tab, onChange }: AdminTabsProps) {
  return (
    <div className="flex border-b border-[#334155]">
      {TABS.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`px-5 py-3 text-sm font-semibold transition-colors ${
            tab === t.key ? ACTIVE_CLASS : INACTIVE_CLASS
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
