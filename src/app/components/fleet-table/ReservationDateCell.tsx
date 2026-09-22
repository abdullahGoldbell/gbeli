'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface Props {
  value: string | null;
  onSave: (date: string | null) => void;
  isAdmin: boolean;
}

function ReadOnlyReservationCell({ formatted, onSave }: { formatted: string; onSave: (date: string | null) => void }) {
  if (formatted) {
    return (
      <div className="min-h-[1.5em] px-1 py-0.5 truncate text-neutral-700" title="Reserved — contact admin to modify">
        {formatted}
      </div>
    );
  }
  const handleReserveToday = () => {
    if (confirm('Reserve this vehicle for today? You will not be able to modify it after.')) {
      onSave(todayISO());
    }
  };
  return (
    <button
      type="button"
      onClick={handleReserveToday}
      className="block w-full text-left cursor-pointer min-h-[1.5em] px-1 py-0.5 rounded hover:bg-command-hover text-primary-accessible"
      title="Click to reserve today"
    >
      Reserve today
    </button>
  );
}

export default function ReservationDateCell({ value, onSave, isAdmin }: Props) {
  const formatted = value && value.includes('T') ? value.split('T')[0] : (value || '');
  const [editing, setEditing] = useState(false);
  const [dateVal, setDateVal] = useState(formatted);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) dateInputRef.current?.focus();
  }, [editing]);

  const handleOpen = useCallback(() => { setDateVal(formatted); setEditing(true); }, [formatted]);
  const handleConfirm = useCallback(() => {
    setEditing(false);
    if (dateVal !== formatted) onSave(dateVal || null);
  }, [dateVal, formatted, onSave]);
  const handleCancel = useCallback(() => { setEditing(false); setDateVal(formatted); }, [formatted]);

  // Non-admin: reserved cell is read-only; empty cell click reserves today
  if (!isAdmin) {
    return <ReadOnlyReservationCell formatted={formatted} onSave={onSave} />;
  }

  // Admin: free date picker
  if (!editing) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="block w-full text-left cursor-pointer min-h-[1.5em] px-1 py-0.5 rounded hover:bg-command-hover truncate"
        title={formatted || 'Click to set date'}
      >
        {formatted || <span className="text-neutral-300">-</span>}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input ref={dateInputRef} type="date" aria-label="Reservation date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} className="flex-1 px-1 py-0.5 text-sm border border-primary rounded focus:outline-none focus:ring-1 focus:ring-primary" />
      <button onClick={handleConfirm} className="px-1.5 py-0.5 bg-primary text-gb-ink text-xs rounded hover:bg-primary-dark">Save</button>
      <button onClick={handleCancel} aria-label="Cancel" className="px-1 py-0.5 text-neutral-400 hover:text-neutral-600 text-xs">✕</button>
    </div>
  );
}
