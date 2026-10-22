import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const type = toast.type || 'success';

  let bgClass = 'bg-slate-900 text-white';
  let Icon = CheckCircle2;
  let iconClass = 'text-emerald-400';

  if (type === 'error') {
    bgClass = 'bg-rose-900 text-white';
    Icon = AlertTriangle;
    iconClass = 'text-rose-400';
  } else if (type === 'info') {
    bgClass = 'bg-blue-900 text-white';
    Icon = Info;
    iconClass = 'text-blue-400';
  }

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-xl border border-white/10 ${bgClass} text-xs animate-in slide-in-from-bottom-3 duration-200`}
    >
      <div className="flex items-center gap-2.5">
        <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />
        <span className="font-medium leading-relaxed">{toast.text}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-1 hover:bg-white/20 rounded-md transition-colors shrink-0 text-white/70 hover:text-white"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
