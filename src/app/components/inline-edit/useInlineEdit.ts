import { useState, useRef, useEffect } from 'react';
import type { InlineEditType, InlineValue } from './types';
import { parseEditValue } from './parseValue';

interface Params {
  value: InlineValue;
  field: string;
  type: InlineEditType;
  onSave: (field: string, value: InlineValue) => void;
}

export function useInlineEdit({ value, field, type, onSave }: Params) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (!editing || !inputRef.current) return;
    inputRef.current.focus();
    if (inputRef.current instanceof HTMLInputElement && type === 'text') {
      inputRef.current.select();
    }
  }, [editing, type]);

  const startEditing = (initial: string) => {
    setEditValue(initial);
    setEditing(true);
  };

  const cancelEditing = () => setEditing(false);

  const handleSave = () => {
    setEditing(false);
    const newValue = parseEditValue(editValue, type);
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

  return { editing, editValue, setEditValue, inputRef, startEditing, cancelEditing, handleSave, handleKeyDown };
}
