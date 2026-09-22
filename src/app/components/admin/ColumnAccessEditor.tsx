'use client';

import ColumnGroupList from './ColumnGroupList';
import type { ColumnSaveMessage } from './types';

interface ColumnAccessEditorProps {
  hiddenCols: Set<string>;
  saving: boolean;
  message: ColumnSaveMessage | null;
  onToggle: (key: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onSave: () => void;
}

export default function ColumnAccessEditor({
  hiddenCols,
  saving,
  message,
  onToggle,
  onShowAll,
  onHideAll,
  onSave,
}: ColumnAccessEditorProps) {
  return (
    <>
      {/* Select all / Deselect all */}
      <div className="flex gap-3 mb-3">
        <button
          onClick={onShowAll}
          className="text-xs text-primary hover:text-primary-light"
        >
          Select All
        </button>
        <button
          onClick={onHideAll}
          className="text-xs text-[#64748b] hover:text-[#94a3b8]"
        >
          Deselect All
        </button>
      </div>

      {/* Column groups */}
      <ColumnGroupList hiddenCols={hiddenCols} onToggle={onToggle} />

      {message && (
        <p className={`text-sm mt-2 ${message.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-primary hover:bg-primary-dark disabled:bg-primary/50 text-gb-ink text-sm font-semibold py-2 rounded-md mt-2"
      >
        {saving ? 'Saving...' : 'Save Column Access'}
      </button>
    </>
  );
}
