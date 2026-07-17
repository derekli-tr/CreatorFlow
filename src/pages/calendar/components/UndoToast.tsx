import { useEffect, useRef } from "react";

export interface ToastItem {
  id: string;
  message: string;
}

interface UndoToastProps {
  toasts: ToastItem[];
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
  durationMs?: number;
}

export default function UndoToast({ toasts, onUndo, onDismiss, durationMs = 5000 }: UndoToastProps) {
  /* Track per-toast timers so each toast auto-dismisses independently */
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const currentIds = new Set(toasts.map((t) => t.id));

    /* Start timers for new toasts */
    toasts.forEach((toast) => {
      if (!timersRef.current.has(toast.id)) {
        timersRef.current.set(
          toast.id,
          setTimeout(() => {
            onDismiss(toast.id);
          }, durationMs)
        );
      }
    });

    /* Clean up timers for toasts that have been removed from the array */
    timersRef.current.forEach((timer, id) => {
      if (!currentIds.has(id)) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    });

    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [toasts, onDismiss, durationMs]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-slide-up"
        >
          <div className="flex items-center gap-4 bg-background-950 text-white px-5 py-3 rounded-xl shadow-lg">
            <div className="flex items-center gap-2.5">
              <span className="w-4 h-4 flex items-center justify-center">
                <i className="ri-check-line text-emerald-400" />
              </span>
              <span className="text-sm font-medium whitespace-nowrap">{toast.message}</span>
            </div>
            <button
              onClick={() => onUndo(toast.id)}
              className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap cursor-pointer"
            >
              Undo
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}