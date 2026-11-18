import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, Loader2, AlertTriangle } from 'lucide-react';
import type { CustomerNotification } from '../../types';

interface NotificationListProps {
  notifications: CustomerNotification[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onMarkAsRead: (id: string) => void;
  /** Called after navigating away (e.g. to close the dropdown panel). Omit on the full page. */
  onAfterNavigate?: () => void;
}

const relativeTime = (value: string): string => {
  const date = new Date(value);
  // Some entries are still client-generated with a plain "Just now" / "2 hours ago"
  // string (see ShopContext.placeOrder) rather than an ISO timestamp — show as-is.
  if (Number.isNaN(date.getTime())) return value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  isLoading,
  error,
  onRetry,
  onMarkAsRead,
  onAfterNavigate,
}) => {
  const navigate = useNavigate();

  const handleClick = (n: CustomerNotification) => {
    if (!n.isRead) onMarkAsRead(n.id);
    if (n.actionUrl) {
      navigate(n.actionUrl);
      onAfterNavigate?.();
    }
  };

  if (isLoading && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-allura-muted">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-xs font-sans">Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
        <AlertTriangle size={20} className="text-rose-500" />
        <p className="text-xs font-sans text-allura-muted">{error}</p>
        <button onClick={onRetry} className="text-xs font-sans font-bold text-allura-goldDark underline">
          Retry
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-allura-muted">
        <BellOff size={20} />
        <p className="text-xs font-sans">No notifications yet</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-allura-border">
      {notifications.map(n => (
        <li key={n.id}>
          <button
            type="button"
            onClick={() => handleClick(n)}
            className={`w-full text-left px-4 py-3 flex gap-2.5 hover:bg-allura-bgSecondary/60 transition-colors ${
              !n.isRead ? 'bg-allura-bgSecondary/30' : ''
            }`}
          >
            <span
              className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.isRead ? 'bg-transparent' : 'bg-allura-goldDark'}`}
              aria-hidden="true"
            />
            <span className="flex-1 min-w-0 space-y-0.5">
              <span className={`block text-xs font-sans ${!n.isRead ? 'font-bold text-allura-text' : 'font-semibold text-allura-text'}`}>
                {n.title}
              </span>
              <span className="block text-[11px] font-sans text-allura-muted line-clamp-2">{n.message}</span>
              <span className="block text-[10px] font-sans text-allura-muted/80">{relativeTime(n.timestamp)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
