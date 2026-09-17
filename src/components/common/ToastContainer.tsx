import React from 'react';
import { useShop } from '../../context/ShopContext';
import { Check, Info, Sparkles, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useShop();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-lg bg-allura-card/95 border border-allura-border text-allura-text shadow-luxury backdrop-blur-md animate-slide-down transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            {toast.type === 'gold' ? (
              <div className="w-8 h-8 rounded-full bg-allura-gold/15 flex items-center justify-center text-allura-gold flex-shrink-0">
                <Sparkles size={16} />
              </div>
            ) : toast.type === 'success' ? (
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                <Check size={16} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-allura-bgSecondary flex items-center justify-center text-allura-muted flex-shrink-0">
                <Info size={16} />
              </div>
            )}
            <p className="text-xs sm:text-sm font-medium leading-tight">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-allura-muted hover:text-allura-text p-1 transition-colors"
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
