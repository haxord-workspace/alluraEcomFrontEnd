import React, { useCallback, useEffect, useState } from 'react';
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
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { usePermissions } from '../../hooks/usePermissions';
import { Link, useNavigate } from 'react-router-dom';
import type { AdminRole } from '../../types';
import { getAdminNotifications, notificationErrorMessage } from '../../service/notifications';
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
  const { role, realRole, roles, can } = usePermissions();
  const canViewNotifications = can('push_email_alerts', 'view');

  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

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

  const toggleBellDropdown = () => {
    const next = !isAdminNotificationsOpen;
    setIsAdminNotificationsOpen(next);
    if (next) {
      fetchBellNotifications();
      markSeenNow();
    }
  };

  const openNotificationDetail = (id: string) => {
    setIsAdminNotificationsOpen(false);
    navigate(`/admin/notifications?id=${id}`);
  };

  const activeRoleLabel = role || realRole || '—';

  const handleRoleChange = (newRole: AdminRole) => {
    setRole(newRole);
    setIsRoleDropdownOpen(false);
  };

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
        
        {/* Role Switcher Pill */}
        <div className="relative">
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-allura-bgSecondary text-allura-darkBrown border border-allura-gold/30 text-xs font-sans font-semibold hover:bg-stone-200 transition-colors"
          >
            <Shield size={13} className="text-allura-goldDark flex-shrink-0" />
            <span className="hidden md:inline text-[11px] text-allura-muted font-normal">Role:</span>
            <span className="font-bold font-mono text-[10px] sm:text-[11px] max-w-[75px] sm:max-w-none truncate">{activeRoleLabel}</span>
            <ChevronDown size={12} className="text-allura-muted flex-shrink-0" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-white border border-stone-200 rounded-2xl shadow-xl p-2 space-y-1 z-50 text-xs font-sans animate-slide-up">
              <span className="block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                Switch Operational Role
              </span>
              {roles.map(r => (
                <button
                  key={r}
                  onClick={() => handleRoleChange(r)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                    role === r ? 'bg-allura-gold/15 text-allura-goldDark font-bold' : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <span className="font-mono text-xs">{r}</span>
                  {role === r && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Dropdown — hidden entirely for roles without view access */}
        {canViewNotifications && (
          <div className="relative">
            <button
              onClick={toggleBellDropdown}
              className="relative p-2 text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                  {badgeLabel}
                </span>
              )}
            </button>

            {isAdminNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-96 bg-white border border-stone-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slide-up">
                <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                  <span className="font-serif text-sm font-bold text-stone-800">
                    Operations Notifications
                  </span>
                  <button
                    onClick={() => setIsAdminNotificationsOpen(false)}
                    className="text-xs text-stone-500 hover:text-stone-800 font-sans"
                  >
                    Close
                  </button>
                </div>

                <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                  {isForbidden ? (
                    <div className="p-5 text-center text-xs font-sans text-stone-500">
                      You don't have access to notifications.
                    </div>
                  ) : isBellLoading && bellItems.length === 0 ? (
                    <div className="p-6 flex flex-col items-center gap-2 text-stone-400">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-xs font-sans">Loading…</span>
                    </div>
                  ) : bellError ? (
                    <div className="p-4 text-xs font-sans text-rose-800 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle size={13} />
                        {bellError}
                      </span>
                      <button onClick={fetchBellNotifications} className="font-bold underline shrink-0">
                        Retry
                      </button>
                    </div>
                  ) : bellItems.length === 0 ? (
                    <div className="p-5 text-center text-xs font-sans text-stone-500">
                      No notifications yet.
                    </div>
                  ) : (
                    bellItems.map(n => (
                      <div
                        key={n.id}
                        onClick={() => openNotificationDetail(n.id)}
                        className="p-3.5 text-xs font-sans transition-colors cursor-pointer hover:bg-stone-50"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-stone-900 flex items-center gap-1.5 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDotClass(n.status)}`} />
                            <span className="truncate">{n.displayTitle || String(n.businessEvent).replace(/_/g, ' ')}</span>
                          </p>
                          <span className="text-[10px] text-stone-400 shrink-0">{relativeTime(n.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-stone-600 text-[11px] truncate">{n.recipient.name || n.recipient.email || '—'}</p>
                          <div className="flex gap-1 text-stone-400 shrink-0">
                            {n.channels.map((c: NotificationChannel, i: number) => (
                              <ChannelDot key={i} channel={c} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Link
                  to="/admin/notifications"
                  onClick={() => {
                    setIsAdminNotificationsOpen(false);
                    markSeenNow();
                  }}
                  className="block p-3 text-center text-xs font-sans font-bold text-[#561C08] hover:bg-stone-50 border-t border-stone-100"
                >
                  View all
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
