'use client';

interface Props {
  displayVal: string;
  readOnly?: boolean;
  onStartEditing: () => void;
}

export default function InlineDisplay({ displayVal, readOnly, onStartEditing }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onStartEditing();
    }
  };
  return (
    <div
      role={readOnly ? undefined : 'button'}
      tabIndex={readOnly ? undefined : 0}
      onClick={readOnly ? undefined : onStartEditing}
      onKeyDown={readOnly ? undefined : handleKeyDown}
      className={`min-h-[1.5em] px-1 py-0.5 rounded truncate ${readOnly ? 'text-neutral-600' : 'cursor-pointer hover:bg-command-hover'}`}
      title={readOnly ? displayVal : (displayVal || 'Click to edit')}
    >
      {displayVal || <span className="text-neutral-300">-</span>}
    </div>
  );
}
