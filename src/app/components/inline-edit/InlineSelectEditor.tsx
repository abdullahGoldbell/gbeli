'use client';

import { EDITOR_INPUT_CLASS, type InlineValue } from './types';

interface Props {
  inputRef: React.RefObject<HTMLSelectElement>;
  fieldLabel: string;
  field: string;
  value: InlineValue;
  editValue: string;
  options: string[];
  setEditValue: (v: string) => void;
  cancelEditing: () => void;
  onSave: (field: string, value: InlineValue) => void;
}

export default function InlineSelectEditor({
  inputRef, fieldLabel, field, value, editValue, options, setEditValue, cancelEditing, onSave,
}: Props) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditValue(e.target.value);
    cancelEditing();
    const val = e.target.value || null;
    if (val !== (value ? String(value) : null)) onSave(field, val);
  };
  return (
    <select
      ref={inputRef}
      aria-label={fieldLabel}
      value={editValue}
      onChange={handleChange}
      onBlur={cancelEditing}
      className={EDITOR_INPUT_CLASS}
    >
      <option value="">-</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
