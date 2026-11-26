import React from 'react';
import { RefreshCw } from 'lucide-react';

interface ReviewsUnavailableProps {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
}

/** Small in-section error state. Never takes over the page. */
export const ReviewsUnavailable: React.FC<ReviewsUnavailableProps> = ({
  message = 'Reviews are unavailable right now.',
  onRetry,
  compact = false,
}) => (
  <div
    role="status"
    className={`flex flex-col sm:flex-row items-center justify-center gap-3 text-center text-xs font-sans text-allura-muted bg-allura-card border border-allura-border rounded-2xl ${
      compact ? 'p-3' : 'p-6'
    }`}
  >
    <span>{message}</span>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center justify-center gap-1.5 min-h-11 px-4 border border-allura-border rounded-xl font-bold uppercase tracking-wider text-allura-darkBrown hover:bg-allura-bg/60 transition-colors"
      >
        <RefreshCw size={13} />
        <span>Retry</span>
      </button>
    )}
  </div>
);
