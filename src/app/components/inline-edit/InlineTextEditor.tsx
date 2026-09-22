'use client';

import { EDITOR_INPUT_CLASS, type InlineEditType } from './types';

const HTML_INPUT_TYPE: Partial<Record<InlineEditType, string>> = { date: 'date', number: 'number' };

interface Props {
  inputRef: React.RefObject<HTMLInputElement>;
  fieldLabel: string;
  type: InlineEditType;
  editValue: string;
  setEditValue: (v: string) => void;
  onSave: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export default function InlineTextEditor({
  inputRef, fieldLabel, type, editValue, setEditValue, onSave, onKeyDown,
}: Props) {
  return (
    <input
      ref={inputRef}
      aria-label={fieldLabel}
      type={HTML_INPUT_TYPE[type] ?? 'text'}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={onSave}
      onKeyDown={onKeyDown}
      className={EDITOR_INPUT_CLASS}
    />
  );
}
