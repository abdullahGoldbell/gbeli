export type InlineValue = string | number | boolean | null;

export type InlineEditType = 'text' | 'number' | 'checkbox' | 'select' | 'date';

export interface InlineEditProps {
  value: InlineValue;
  field: string;
  type?: InlineEditType;
  options?: string[];
  readOnly?: boolean;
  onSave: (field: string, value: InlineValue) => void;
}

export const EDITOR_INPUT_CLASS =
  'w-full px-1 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500';
