'use client';

import { ReactNode } from 'react';

const TONES = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  green: 'bg-green-600 hover:bg-green-700',
  violet: 'bg-violet-600 hover:bg-violet-700',
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
      className={`px-3 py-1.5 text-white text-xs font-medium rounded-md ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}
