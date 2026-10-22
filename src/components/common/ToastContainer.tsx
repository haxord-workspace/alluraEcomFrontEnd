import React from 'react';
import { useShop } from '../../context/ShopContext';
import { Check, Info, Sparkles, X, AlertCircle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useShop();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map(toast => {
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            role={isError ? 'alert' : 'status'}
            aria-live={isError ? 'assertive' : 'polite'}
            className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl shadow-luxury backdrop-blur-md animate-slide-down transition-all duration-300 ${
              isError
                ? 'bg-rose-950/95 border-2 border-rose-500/80 text-white shadow-rose-950/50'
                : 'bg-allura-card/95 border border-allura-border text-allura-text'
            }`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {toast.type === 'gold' ? (
                <div className="w-8 h-8 rounded-full bg-allura-gold/15 flex items-center justify-center text-allura-gold flex-shrink-0 mt-0.5">
                  <Sparkles size={16} />
                </div>
              ) : toast.type === 'success' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0 mt-0.5">
                  <Check size={16} />
                </div>
              ) : isError ? (
                <div className="w-8 h-8 rounded-full bg-rose-500/25 flex items-center justify-center text-rose-300 flex-shrink-0 mt-0.5 border border-rose-500/30">
                  <AlertCircle size={17} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-muted flex-shrink-0 mt-0.5">
                  <Info size={16} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {isError && (
                  <p className="text-[10px] font-mono font-bold tracking-wider uppercase text-rose-400 mb-0.5">
                    Backend Error
                  </p>
                )}
                <p
                  className={`text-xs sm:text-sm font-medium leading-relaxed break-words ${
                    isError ? 'text-rose-100 font-sans' : 'text-allura-text'
                  }`}
                >
                  {toast.message}
                </p>
              </div>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className={`p-1 transition-colors flex-shrink-0 rounded-md ${
                isError
                  ? 'text-rose-300 hover:text-white hover:bg-rose-900/50'
                  : 'text-allura-muted hover:text-allura-text hover:bg-allura-bgSecondary'
              }`}
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

