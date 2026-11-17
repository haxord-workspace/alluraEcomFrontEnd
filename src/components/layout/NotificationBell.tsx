import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { NotificationList } from './NotificationList';

export const NotificationBell: React.FC = () => {
  const {
    notifications,
    unreadNotificationCount,
    isLoadingNotifications,
    notificationsError,
    refreshNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useShop();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = () => setIsOpen(false);

  const toggleOpen = () => {
    setIsOpen(v => {
      const next = !v;
      if (next) refreshNotifications();
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="text-[#000000] hover:text-[#561C08] transition-colors p-1 relative flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#561C08] focus-visible:ring-offset-1 rounded-full"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell size={20} />
        {unreadNotificationCount > 0 && (
          <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-[#561C08] text-white text-[9px] font-bold flex items-center justify-center">
            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="fixed inset-x-4 top-[72px] sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80 bg-white border border-allura-border rounded-2xl shadow-luxury z-50 overflow-hidden animate-fade-in"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-allura-border">
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-allura-text">Notifications</span>
            {unreadNotificationCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsAsRead}
                className="text-[11px] font-sans font-bold text-allura-goldDark hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            <NotificationList
              notifications={notifications}
              isLoading={isLoadingNotifications}
              error={notificationsError}
              onRetry={refreshNotifications}
              onMarkAsRead={markNotificationAsRead}
              onAfterNavigate={close}
            />
          </div>

          <Link
            to="/account/notifications"
            onClick={close}
            className="block text-center py-2.5 text-xs font-sans font-bold text-allura-goldDark hover:bg-allura-bgSecondary/60 border-t border-allura-border transition-colors"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
};
