import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface AdminErrorBannerProps {
  error: string | null | undefined;
  onDismiss?: () => void;
  title?: string;
  className?: string;
}

export const AdminErrorBanner: React.FC<AdminErrorBannerProps> = ({
  error,
  onDismiss,
  title = 'Backend Error',
  className = '',
}) => {
  if (!error) return null;

  return (
    <div
      role="alert"
      className={`p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-start gap-3 shadow-xs animate-slide-down ${className}`}
    >
      <div className="w-6 h-6 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 flex-shrink-0 mt-0.5 border border-rose-200">
        <AlertCircle size={15} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-rose-900 text-[11px] uppercase tracking-wider font-mono">
          {title}
        </p>
        <p className="text-rose-800 text-xs mt-0.5 leading-relaxed break-words font-sans">
          {error}
        </p>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-rose-400 hover:text-rose-700 p-1 rounded-md hover:bg-rose-100/60 transition-colors flex-shrink-0"
          aria-label="Dismiss error"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
