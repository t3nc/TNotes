import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useUiStore } from '../../store/ui';
import { cn } from '../../lib/cn';

const toneClass = {
  info: 'border-info/40 bg-info/10 text-info',
  success: 'border-success/40 bg-success/10 text-success',
  error: 'border-danger/40 bg-danger/10 text-danger',
};

export function ToastHost() {
  const toasts = useUiStore((state) => state.toasts);
  const dismiss = useUiStore((state) => state.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'animate-fade-up pointer-events-auto flex max-w-md items-center gap-2.5 rounded-xl border px-4 py-2.5 text-[13px] shadow-lift backdrop-blur',
            toneClass[toast.tone],
          )}
        >
          {toast.tone === 'success' ? <CheckCircle2 size={16} /> : null}
          {toast.tone === 'error' ? <AlertCircle size={16} /> : null}
          {toast.tone === 'info' ? <Info size={16} /> : null}
          <span className="text-text">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="关闭提示"
            className="ml-1 rounded p-0.5 text-faint transition hover:text-text"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
