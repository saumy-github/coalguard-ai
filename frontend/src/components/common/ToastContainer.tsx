import React from 'react';
import { useUIStore } from '../../store/uiStore';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useUIStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        // Ember doubles as both "error" and "primary action" in Caldera's
        // constrained 3-accent palette (see StatusBadge) — Obsidian-on-Chalk
        // is the neutral default so success/info don't need a 4th hue either.
        const getToastStyles = () => {
          switch (t.type) {
            case 'success':
              return 'bg-obsidian text-chalk';
            case 'warning':
              return 'bg-sulfur text-obsidian';
            case 'error':
              return 'bg-ember text-chalk';
            default:
              return 'bg-chalk text-obsidian';
          }
        };

        const getToastIcon = () => {
          switch (t.type) {
            case 'success':
              return <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />;
            case 'warning':
              return <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />;
            case 'error':
              return <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />;
            default:
              return <Info className="w-4 h-4 shrink-0 mt-0.5" />;
          }
        };

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-card flex items-start gap-3 transition-all ${getToastStyles()}`}
          >
            {getToastIcon()}
            <div className="flex-1 min-w-0">
              <h5 className="text-sm font-medium truncate">
                {t.title}
              </h5>
              {t.message && (
                <p className="text-xs mt-0.5 leading-relaxed opacity-80">
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="opacity-60 hover:opacity-100 p-1 rounded-full transition-opacity"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
