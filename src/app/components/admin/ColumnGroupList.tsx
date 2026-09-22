'use client';

import { COLUMN_GROUPS } from './columnGroups';

interface ColumnGroupListProps {
  hiddenCols: Set<string>;
  onToggle: (key: string) => void;
}

export default function ColumnGroupList({ hiddenCols, onToggle }: ColumnGroupListProps) {
  return (
    <>
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
                    onChange={() => onToggle(col.key)}
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
    </>
  );
}
