import type { InlineEditType, InlineValue } from './types';

/** Converts the raw display value to the string shown in display mode (ISO dates -> YYYY-MM-DD). */
export function toDisplayValue(value: InlineValue, type: InlineEditType): string {
  const displayVal = value === null || value === undefined ? '' : String(value);
  if (type === 'date' && displayVal && displayVal.includes('T')) {
    return displayVal.split('T')[0];
  }
  return displayVal;
}

/** Converts the trimmed editor text into the value handed to onSave. */
export function parseEditValue(editValue: string, type: InlineEditType): string | number | null {
  const trimmed = editValue.trim() || null;
  if (type !== 'number' || trimmed === null) return trimmed;
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}
