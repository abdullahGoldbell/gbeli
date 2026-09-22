export type ToastType = 'info' | 'success' | 'warning';

type ToastHandler = (message: string, type: ToastType) => void;

let handler: ToastHandler | null = null;

/** Called by the mounted <Notifications /> component to receive toasts. */
export function registerToastHandler(next: ToastHandler | null): void {
  handler = next;
}

export function showToast(message: string, type: ToastType = 'info'): void {
  handler?.(message, type);
}
