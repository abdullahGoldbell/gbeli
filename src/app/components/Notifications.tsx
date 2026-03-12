'use client';

import { useState, useEffect, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  timestamp: number;
}

let addToastExternal: ((message: string, type?: Toast['type']) => void) | null = null;

export function showToast(message: string, type: Toast['type'] = 'info') {
  if (addToastExternal) {
    addToastExternal(message, type);
  }
}

export default function Notifications() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { id, message, type, timestamp: Date.now() }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastExternal = addToast;
    return () => { addToastExternal = null; };
  }, [addToast]);

  if (toasts.length === 0) return null;

  const bgColors = {
    info: 'bg-blue-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-600',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-enter ${bgColors[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg text-sm flex items-center gap-2`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-white/70 hover:text-white text-lg leading-none"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
