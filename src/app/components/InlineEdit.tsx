'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string | number | boolean | null;
  field: string;
  type?: 'text' | 'number' | 'checkbox' | 'select' | 'date';
  options?: string[];
  readOnly?: boolean;
  onSave: (field: string, value: string | number | boolean | null) => void;
}

export default function InlineEdit({ value, field, type = 'text', options, readOnly, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement && type === 'text') {
        inputRef.current.select();
      }
    }
  }, [editing, type]);

  if (type === 'checkbox') {
    return (
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => !readOnly && onSave(field, e.target.checked)}
        disabled={readOnly}
        className={`w-4 h-4 accent-blue-600 ${readOnly ? 'opacity-60' : 'cursor-pointer'}`}
      />
    );
  }

  if (readOnly || !editing) {
    let displayVal = value === null || value === undefined ? '' : String(value);
    // Format ISO dates to YYYY-MM-DD
    if (type === 'date' && displayVal && displayVal.includes('T')) {
      displayVal = displayVal.split('T')[0];
    }
    return (
      <div
        onClick={readOnly ? undefined : () => {
          setEditValue(displayVal);
          setEditing(true);
        }}
        className={`min-h-[1.5em] px-1 py-0.5 rounded truncate ${readOnly ? 'text-neutral-600' : 'cursor-pointer hover:bg-blue-50'}`}
        title={readOnly ? displayVal : (displayVal || 'Click to edit')}
      >
        {displayVal || <span className="text-neutral-300">-</span>}
      </div>
    );
  }

  const handleSave = () => {
    setEditing(false);
    let newValue: string | number | null = editValue.trim() || null;
    if (type === 'number' && newValue !== null) {
      newValue = parseFloat(newValue);
      if (isNaN(newValue)) newValue = null;
    }
    if (String(newValue) !== String(value)) {
      onSave(field, newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  };

  if (type === 'select' && options) {
    return (
      <select
        ref={inputRef as React.RefObject<HTMLSelectElement>}
        value={editValue}
        onChange={(e) => {
          setEditValue(e.target.value);
          setEditing(false);
          const val = e.target.value || null;
          if (val !== (value ? String(value) : null)) onSave(field, val);
        }}
        onBlur={() => setEditing(false)}
        className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">-</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef as React.RefObject<HTMLInputElement>}
      type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className="w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
    />
  );
}
