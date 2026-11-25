import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  Bell,
  Shield,
  Menu,
  ChevronDown,
  LogOut,
  Check,
  Mail,
  Smartphone,
  AlertTriangle,
  BellOff,
  RefreshCw,
  X,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useCloseOnScroll } from '../../hooks/useCloseOnScroll';
import { useAdminPushNotifications } from '../../hooks/useAdminPushNotifications';
import { Link, useNavigate } from 'react-router-dom';
// import type { AdminRole } from '../../types';
import { getAdminNotifications, notificationErrorMessage } from '../../service/notifications';
import { isPushSupported } from '../../service/firebase';
import type { Notification, NotificationChannel } from '../../types/notification';

interface AdminHeaderProps {
  onMobileMenuToggle: () => void;
}

const BELL_PAGE_SIZE = 10;
const POLL_INTERVAL_MS = 60000;

const seenKey = (adminId: string) => `allura_admin_notif_seen_${adminId}`;

const relativeTime = (iso?: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? '' : 's'} ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
};

const statusDotClass = (status: string) => {
  if (status === 'SENT') return 'bg-emerald-500';
  if (status === 'FAILED') return 'bg-rose-600';
  if (status === 'PARTIALLY_SENT') return 'bg-amber-500';
  return 'bg-stone-400'; // PENDING / QUEUED
};

const ChannelDot: React.FC<{ channel: NotificationChannel }> = ({ channel }) =>
  channel === 'PUSH' ? <Smartphone size={11} /> : <Mail size={11} />;

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onMobileMenuToggle }) => {
  const {
    currentAdmin,
    setRole,
    setIsCommandOpen,
    isAdminNotificationsOpen,
    setIsAdminNotificationsOpen,
    adminLogout,
  } = useAdmin();
  const { role, realRole, can } = usePermissions();
  const canViewNotifications = can('push_email_alerts', 'view');
  const { showToast } = useShop();

  // Browser notification permission + FCM registration (reuses the existing
  // firebase.ts token/messaging plumbing and registerDeviceToken endpoint).
  const { requestAndRegister } = useAdminPushNotifications(canViewNotifications);

  // After login, if permission hasn't been decided yet, trigger the native
  // browser prompt once per session (no custom modal — see case B/C below
  // for denied/granted handling).
  useEffect(() => {
    if (!canViewNotifications || !isPushSupported()) return;
    if (Notification.permission !== 'default') return;
    const askedKey = 'allura_admin_push_asked_session';
    try {
      if (sessionStorage.getItem(askedKey)) return;
      sessionStorage.setItem(askedKey, '1');
    } catch {
      // ignore storage errors
    }
    requestAndRegister();
  }, [canViewNotifications, requestAndRegister]);

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const previewRoles: ('SUPER_ADMIN' | 'ADMIN' | 'CATALOG_MANAGER' | 'ORDER_MANAGER')[] = [
    'SUPER_ADMIN',
    'ADMIN',
    'CATALOG_MANAGER',
    'ORDER_MANAGER',
  ];
  const isRealSuperAdmin = realRole === 'SUPER_ADMIN';

  const handleRoleChange = (r: 'SUPER_ADMIN' | 'ADMIN' | 'CATALOG_MANAGER' | 'ORDER_MANAGER') => {
    setRole(r);
    setIsRoleDropdownOpen(false);
  };

  // Real admin notifications (bell) ─ list fetched from GET /admin/notifications
  const [bellItems, setBellItems] = useState<Notification[]>([]);
  const [isBellLoading, setIsBellLoading] = useState(false);
  const [bellError, setBellError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(0);

  useEffect(() => {
    if (!currentAdmin.id) return;
    try {
      setLastSeen(Number(localStorage.getItem(seenKey(currentAdmin.id))) || 0);
    } catch {
      setLastSeen(0);
    }
  }, [currentAdmin.id]);

  const fetchBellNotifications = useCallback(async () => {
    if (!canViewNotifications) return;
    setIsBellLoading(true);
    setBellError(null);
    try {
      const result = await getAdminNotifications({ page: 1, limit: BELL_PAGE_SIZE });
      setBellItems(result.notifications);
      setIsForbidden(false);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setIsForbidden(true);
        setBellItems([]);
      } else {
        setBellError(notificationErrorMessage(err, 'Could not load notifications'));
      }
    } finally {
      setIsBellLoading(false);
    }
  }, [canViewNotifications]);

  // Poll every 60s while the tab is visible and the admin can view notifications
  useEffect(() => {
    if (!canViewNotifications) return;
    fetchBellNotifications();

    const tick = () => {
      if (document.visibilityState === 'visible') fetchBellNotifications();
    };
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [canViewNotifications, fetchBellNotifications]);

  const markSeenNow = useCallback(() => {
    if (!currentAdmin.id) return;
    const now = Date.now();
    setLastSeen(now);
    try {
      localStorage.setItem(seenKey(currentAdmin.id), String(now));
    } catch {
      // Ignore storage errors
    }
  }, [currentAdmin.id]);

  const unreadCount = bellItems.filter(n => new Date(n.createdAt).getTime() > lastSeen).length;
  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

  // Last-seen timestamp captured when the panel opened, so items that were new
  // at that moment stay highlighted while it is open
  const [seenBeforeOpen, setSeenBeforeOpen] = useState<number>(0);

  const toggleBellDropdown = () => {
    const next = !isAdminNotificationsOpen;

    // Browser-notification permission handling, separate from the in-app
    // notifications list below which stays functional regardless of it.
    if (next && isPushSupported()) {
      if (Notification.permission === 'denied') {
        showToast('Notifications are blocked. Enable them in your browser site settings.', 'info');
      } else if (Notification.permission === 'default') {
        requestAndRegister();
      }
    }

    setIsAdminNotificationsOpen(next);
    if (next) {
      setSeenBeforeOpen(lastSeen);
      fetchBellNotifications();
      markSeenNow();
    }
  };

  // Close the bell dropdown when the page is scrolled while it is open
  // (scrolling the dropdown's own list keeps it open)
  const bellContainerRef = useRef<HTMLDivElement>(null);
  const closeBellDropdown = useCallback(() => setIsAdminNotificationsOpen(false), [setIsAdminNotificationsOpen]);
  useCloseOnScroll(isAdminNotificationsOpen, bellContainerRef, closeBellDropdown);

  // Close on outside tap/click and on Escape
  useEffect(() => {
    if (!isAdminNotificationsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !bellContainerRef.current?.contains(e.target)) closeBellDropdown();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeBellDropdown();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isAdminNotificationsOpen, closeBellDropdown]);

  const openNotificationDetail = (id: string) => {
    setIsAdminNotificationsOpen(false);
    navigate(`/admin/notifications?id=${id}`);
  };

  const activeRoleLabel = role || realRole || '—';


  // e.g. SUPER_ADMIN -> Super Admin
  const roleLabel = activeRoleLabel
    .toLowerCase()
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  return (
    <header className="print:hidden sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-allura-border flex items-center justify-between px-4 sm:px-6">

      {/* Left: Mobile Menu & Search trigger */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 text-allura-muted hover:text-allura-text rounded-xl hover:bg-stone-100"
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        {/* Mobile Search Icon Button */}
        <button
          onClick={() => setIsCommandOpen(true)}
          className="sm:hidden p-2 text-allura-muted hover:text-allura-text rounded-xl hover:bg-stone-100"
          title="Search (Cmd+K)"
          aria-label="Search"
        >
          <Search size={18} />
        </button>

        {/* Desktop Global Search button */}
        <button
          onClick={() => setIsCommandOpen(true)}
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-500 text-xs font-sans transition-all w-64 md:w-80 shadow-xs"
        >
          <Search size={14} className="text-stone-400" />
          <span className="flex-1 text-left truncate">Search orders, SKU, customers...</span>
          <kbd className="text-[10px] font-mono bg-white text-stone-600 px-1.5 py-0.5 rounded border border-stone-200">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Role Switcher, Notifications, Admin Profile */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Role Switcher Pill — interactive preview for Super Admin; read-only badge for others */}
        {isRealSuperAdmin ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-allura-bgSecondary text-allura-darkBrown border border-allura-gold/30 text-xs font-sans font-semibold hover:bg-stone-200 transition-colors"
              title="Preview UI permissions as different role"
            >
              <Shield size={13} className="text-allura-goldDark flex-shrink-0" />
              <span className="hidden md:inline text-[11px] text-allura-muted font-normal">Role:</span>
              <span className="font-bold font-mono text-[10px] sm:text-[11px] max-w-[75px] sm:max-w-none truncate">{activeRoleLabel}</span>
              <ChevronDown size={12} className="text-allura-muted flex-shrink-0" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 space-y-1 z-50 text-xs font-sans animate-slide-up">
                <span className="block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Preview Role Matrix
                </span>
                {previewRoles.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${role === r ? 'bg-allura-gold/15 text-allura-goldDark font-bold' : 'hover:bg-stone-50 text-stone-700'
                      }`}
                  >
                    <span className="font-mono text-xs">{r}</span>
                    {role === r && <Check size={14} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-allura-bgSecondary text-allura-darkBrown border border-allura-gold/30 text-xs font-sans font-semibold">
            <Shield size={13} className="text-allura-goldDark flex-shrink-0" />
            <span className="hidden md:inline text-[11px] text-allura-muted font-normal">Role:</span>
            <span className="font-bold font-mono text-[10px] sm:text-[11px] max-w-[75px] sm:max-w-none truncate">{activeRoleLabel}</span>
          </div>
        )}

        {/* Notifications Dropdown — hidden entirely for roles without view access */}
        {canViewNotifications && (
          <div className="relative" ref={bellContainerRef}>
            <button
              onClick={toggleBellDropdown}
              className={`relative p-2 rounded-xl transition-colors ${isAdminNotificationsOpen
                ? 'bg-stone-100 text-stone-800'
                : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                }`}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} new` : 'Notifications'}
              aria-haspopup="dialog"
              aria-expanded={isAdminNotificationsOpen}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                  {badgeLabel}
                </span>
              )}
            </button>

            {isAdminNotificationsOpen && (
              <div
                role="dialog"
                aria-label="Notifications"
                className="fixed inset-x-3 top-[4.5rem] max-h-[calc(100dvh-5.5rem)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 sm:max-h-[min(32rem,calc(100dvh-6rem))] flex flex-col bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up"
              >
                {/* Header */}
                <div className="shrink-0 px-4 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-serif text-sm font-bold text-stone-800 truncate">Notifications</p>
                    <p className="text-[11px] font-sans text-stone-500">
                      {bellItems.length > 0 ? `Latest ${bellItems.length} operations alerts` : 'Operations alerts'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={fetchBellNotifications}
                      disabled={isBellLoading}
                      className="p-2 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 disabled:opacity-50 transition-colors"
                      aria-label="Refresh notifications"
                      title="Refresh"
                    >
                      <RefreshCw size={15} className={isBellLoading ? 'animate-spin' : ''} />
                    </button>
                    <button
                      onClick={closeBellDropdown}
                      className="p-2 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
                      aria-label="Close notifications"
                      title="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                  {isForbidden ? (
                    <div className="px-6 py-10 flex flex-col items-center gap-2 text-center">
                      <Shield size={22} className="text-stone-300" />
                      <p className="text-xs font-sans text-stone-500">You don't have access to notifications.</p>
                    </div>
                  ) : isBellLoading && bellItems.length === 0 ? (
                    <ul className="divide-y divide-stone-100" aria-busy="true">
                      {Array.from({ length: 4 }).map((_, idx) => (
                        <li key={idx} className="px-4 py-3.5 space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <div className="h-3.5 w-2/3 bg-stone-200/80 rounded animate-pulse" />
                            <div className="h-3 w-12 bg-stone-200/70 rounded animate-pulse" />
                          </div>
                          <div className="h-3 w-1/2 bg-stone-200/70 rounded animate-pulse" />
                        </li>
                      ))}
                    </ul>
                  ) : bellError ? (
                    <div className="px-6 py-10 flex flex-col items-center gap-3 text-center">
                      <AlertTriangle size={22} className="text-rose-400" />
                      <p className="text-xs font-sans text-rose-800">{bellError}</p>
                      <button
                        onClick={fetchBellNotifications}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-sans font-semibold text-stone-700 hover:bg-stone-50"
                      >
                        <RefreshCw size={12} />
                        Retry
                      </button>
                    </div>
                  ) : bellItems.length === 0 ? (
                    <div className="px-6 py-10 flex flex-col items-center gap-2 text-center">
                      <BellOff size={22} className="text-stone-300" />
                      <p className="text-sm font-sans font-medium text-stone-700">You're all caught up</p>
                      <p className="text-xs font-sans text-stone-500">New operations alerts will appear here.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-stone-100">
                      {bellItems.map(n => {
                        const isNew = new Date(n.createdAt).getTime() > seenBeforeOpen;
                        const title = n.displayTitle || String(n.businessEvent).replace(/_/g, ' ');
                        return (
                          <li key={n.id}>
                            <button
                              type="button"
                              onClick={() => openNotificationDetail(n.id)}
                              className={`w-full text-left px-4 py-3.5 font-sans transition-colors hover:bg-stone-50 focus:outline-none focus-visible:bg-stone-100 ${isNew ? 'bg-amber-50/60' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${statusDotClass(n.status)}`}
                                  title={String(n.status).replace(/_/g, ' ')}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className={`text-[13px] leading-snug text-stone-900 line-clamp-2 break-words ${isNew ? 'font-bold' : 'font-semibold'}`}>
                                      {title}
                                    </p>
                                    <span className="text-[10px] text-stone-400 shrink-0 whitespace-nowrap pt-0.5">
                                      {relativeTime(n.createdAt)}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-2">
                                    <p className="text-stone-600 text-xs truncate">
                                      {n.recipient.name || n.recipient.email || '—'}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-stone-400 shrink-0">
                                      {n.channels.map((c: NotificationChannel, i: number) => (
                                        <ChannelDot key={i} channel={c} />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Footer */}
                <Link
                  to="/admin/notifications"
                  onClick={() => {
                    setIsAdminNotificationsOpen(false);
                    markSeenNow();
                  }}
                  className="shrink-0 block py-3.5 text-center text-xs font-sans font-bold text-[#561C08] hover:bg-stone-50 border-t border-stone-200"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </div>
        )}

        {/* User Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            className="flex items-center gap-2 p-1 text-stone-700 hover:text-stone-900 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-allura-darkBrown text-white font-serif font-bold text-xs flex items-center justify-center shadow-xs">
              {roleLabel.charAt(0)}
            </div>
            <span className="hidden lg:block text-xs font-sans font-medium text-stone-800">
              {roleLabel}
            </span>
            <ChevronDown size={13} className="text-stone-400 hidden lg:block" />
          </button>

          {isUserDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 space-y-1 z-50 text-xs font-sans animate-slide-up">
              <div className="px-3 py-2 border-b border-stone-100">
                <p className="font-bold text-stone-900 truncate">{currentAdmin.name}</p>
                <p className="text-[10px] text-stone-500 truncate">{currentAdmin.email}</p>
              </div>
              <Link
                to="/admin/settings"
                onClick={() => setIsUserDropdownOpen(false)}
                className="w-full text-left px-3 py-2 rounded-xl text-stone-700 hover:bg-stone-50 flex items-center justify-between"
              >
                <span>Store Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 flex items-center gap-2 font-medium"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>

      </div>

    </header>
  );
};
