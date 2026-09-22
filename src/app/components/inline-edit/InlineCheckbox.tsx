'use client';

import type { InlineValue } from './types';

interface Props {
  value: InlineValue;
  field: string;
  fieldLabel: string;
  readOnly?: boolean;
  onSave: (field: string, value: InlineValue) => void;
}

export default function InlineCheckbox({ value, field, fieldLabel, readOnly, onSave }: Props) {
  return (
    <input
      type="checkbox"
      aria-label={fieldLabel}
      checked={!!value}
      onChange={(e) => !readOnly && onSave(field, e.target.checked)}
      disabled={readOnly}
      className={`w-4 h-4 accent-blue-600 ${readOnly ? 'opacity-60' : 'cursor-pointer'}`}
    />
  );
}
