'use client';

import type { InlineEditProps } from './inline-edit/types';
import { useInlineEdit } from './inline-edit/useInlineEdit';
import { toDisplayValue } from './inline-edit/parseValue';
import InlineCheckbox from './inline-edit/InlineCheckbox';
import InlineDisplay from './inline-edit/InlineDisplay';
import InlineSelectEditor from './inline-edit/InlineSelectEditor';
import InlineTextEditor from './inline-edit/InlineTextEditor';

export default function InlineEdit({ value, field, type = 'text', options, readOnly, onSave }: InlineEditProps) {
  const fieldLabel = field.replace(/_/g, ' ');
  const edit = useInlineEdit({ value, field, type, onSave });

  if (type === 'checkbox') {
    return <InlineCheckbox value={value} field={field} fieldLabel={fieldLabel} readOnly={readOnly} onSave={onSave} />;
  }

  if (readOnly || !edit.editing) {
    const displayVal = toDisplayValue(value, type);
    return (
      <InlineDisplay displayVal={displayVal} readOnly={readOnly} onStartEditing={() => edit.startEditing(displayVal)} />
    );
  }

  if (type === 'select' && options) {
    return (
      <InlineSelectEditor
        inputRef={edit.inputRef as React.RefObject<HTMLSelectElement>}
        fieldLabel={fieldLabel}
        field={field}
        value={value}
        editValue={edit.editValue}
        options={options}
        setEditValue={edit.setEditValue}
        cancelEditing={edit.cancelEditing}
        onSave={onSave}
      />
    );
  }

  return (
    <InlineTextEditor
      inputRef={edit.inputRef as React.RefObject<HTMLInputElement>}
      fieldLabel={fieldLabel}
      type={type}
      editValue={edit.editValue}
      setEditValue={edit.setEditValue}
      onSave={edit.handleSave}
      onKeyDown={edit.handleKeyDown}
    />
  );
}
