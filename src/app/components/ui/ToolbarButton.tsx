'use client';

import { ReactNode } from 'react';

const TONES = {
  blue: 'bg-primary hover:bg-primary-dark text-gb-ink',
  green: 'bg-success hover:bg-success-dark text-white',
  violet: 'bg-charcoal-light hover:bg-charcoal text-white',
} as const;

interface Props {
  tone: keyof typeof TONES;
  onClick: () => void;
  children: ReactNode;
}

/** Small solid action button used in table toolbars. */
export default function ToolbarButton({ tone, onClick, children }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}
