import { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

let toastFn: ((type: ToastType, message: string) => void) | null = null;

export function toast(type: ToastType, message: string) {
  toastFn?.(type, message);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    toastFn = (type: ToastType, message: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), 3000);
    };
    return () => { toastFn = null; };
  }, [remove]);

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 animate-slide-up">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg bg-white border animate-scale-in min-w-[280px] ${
            t.type === 'success' ? 'border-success-200' :
            t.type === 'error' ? 'border-error-200' : 'border-primary-200'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-success-500 shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-error-500 shrink-0" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-primary-500 shrink-0" />}
          <span className="text-sm font-medium text-slate-700 flex-1">{t.message}</span>
          <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
