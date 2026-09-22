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
          className="text-xs text-blue-400 hover:text-blue-300"
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
        <p className={`text-sm mt-2 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm font-semibold py-2 rounded-md mt-2"
      >
        {saving ? 'Saving...' : 'Save Column Access'}
      </button>
    </>
  );
}
