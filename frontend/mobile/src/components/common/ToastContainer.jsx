import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const getToastStyles = () => {
          switch (t.type) {
            case 'success':
              return 'border-emerald-500/50 bg-[#161f1a] text-emerald-300';
            case 'warning':
              return 'border-amber-500/50 bg-[#241d13] text-amber-300';
            case 'error':
              return 'border-red-500/50 bg-[#251515] text-red-300';
            default:
              return 'border-[#8d5d3e]/50 bg-[#1f1a18] text-[#ffe3d3]';
          }
        };

        const getToastIcon = () => {
          switch (t.type) {
            case 'success':
              return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />;
            case 'warning':
              return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />;
            case 'error':
              return <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />;
            default:
              return <Info className="w-4 h-4 text-[#f6b994] shrink-0 mt-0.5" />;
          }
        };

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-xl border shadow-2xl flex items-start gap-3 backdrop-blur-md transition-all ${getToastStyles()}`}
          >
            {getToastIcon()}
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold font-['Sora'] text-white truncate">
                {t.title}
              </h5>
              {t.message && (
                <p className="text-[11px] font-mono text-[#d6c3b9] mt-0.5 leading-relaxed">
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[#9e8d85] hover:text-white p-1 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
