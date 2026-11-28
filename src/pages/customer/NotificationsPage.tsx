import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Package,
  Tag,
  User,
  Truck,
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertTriangle,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertCircle,
  Share2,
  Trash2,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useConfirm } from '../../context/ConfirmContext';
import { formatCustomerNotificationView } from '../../utils/userFacingText';
import { getPushCapabilityStatus, isIOSDevice, isInstalledPWA, type PushCapabilityStatus } from '../../utils/pushPlatform';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    isLoadingNotifications,
    notificationsError,
    refreshNotifications,
    enablePushNotifications,
  } = useShop();
  const confirm = useConfirm();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete notification',
      message: "Delete this notification? This can't be undone.",
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      isDestructive: true,
    });
    if (!ok) return;

    setDeletingId(id);
    try {
      await deleteNotification(id);
    } catch {
      // Handled in ShopContext with error toasts
    } finally {
      setDeletingId(null);
    }
  };

  // Push notification state detection
  type ExtendedPushStatus = PushCapabilityStatus | 'registration_failed';
  const [pushStatus, setPushStatus] = useState<ExtendedPushStatus>(() => getPushCapabilityStatus());
  const [isEnablingPush, setIsEnablingPush] = useState(false);

  const handleEnablePush = async () => {
    setIsEnablingPush(true);
    try {
      const result = await enablePushNotifications();
      if (result.success && result.status === 'granted') {
        setPushStatus('granted');
      } else if (result.status === 'denied') {
        setPushStatus('denied');
      } else if (result.status === 'registration_failed') {
        setPushStatus('registration_failed');
      } else if (result.status === 'ios_not_pwa') {
        setPushStatus('ios_not_pwa');
      } else if (result.status === 'unsupported') {
        setPushStatus('unsupported');
      } else {
        setPushStatus('registration_failed');
      }
    } finally {
      setIsEnablingPush(false);
    }
  };

  const categories = ['All', 'Orders', 'Shipping', 'Offers', 'Account'];

  const filtered = notifications.filter(
    n => activeCategory === 'All' || n.category === activeCategory
  );

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'Orders':
        return <Package size={16} className="text-allura-gold" />;
      case 'Shipping':
        return <Truck size={16} className="text-emerald-700" />;
      case 'Offers':
        return <Tag size={16} className="text-amber-700" />;
      default:
        return <User size={16} className="text-allura-softBrown" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-allura-border/60 pb-6">
        <div>
          <Link
            to="/account"
            className="inline-flex items-center gap-1.5 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Account</span>
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal">
            Notifications Center
          </h1>
          <p className="text-xs font-sans text-allura-muted mt-1">
            Real-time updates on your boutique orders, tracking milestones, and private offers.
          </p>
        </div>

        <button
          onClick={markAllNotificationsAsRead}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-text hover:bg-allura-bgSecondary transition-colors"
        >
          <CheckCheck size={14} />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Push Notifications Status / Control Card */}
      <div className="bg-allura-card border border-allura-border/80 rounded-2xl p-5 sm:p-6 shadow-subtle">
        {pushStatus === 'unsupported' || pushStatus === 'ios_version_unsupported' ? (
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-allura-bgSecondary flex items-center justify-center flex-shrink-0 text-allura-muted">
              <BellOff size={18} />
            </div>
            <div>
              <h3 className="font-serif text-sm font-medium text-allura-text">
                Push notifications are not supported in this browser.
              </h3>
              <p className="text-xs font-sans text-allura-muted mt-0.5">
                {pushStatus === 'ios_version_unsupported'
                  ? 'Web push notifications require iOS 16.4 or later. Please update your device software.'
                  : 'Your browser environment does not support web push notifications.'}
              </p>
            </div>
          </div>
        ) : pushStatus === 'ios_not_pwa' && isIOSDevice() && !isInstalledPWA() ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                <Share2 size={18} />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-base font-normal text-allura-text">
                  Add Allura Boutique to your Home Screen to enable notifications.
                </h3>
                <p className="text-xs font-sans text-allura-muted">
                  Apple requires Allura Boutique to be installed as a Home Screen web app to receive push alerts.
                </p>
              </div>
            </div>

            <div className="bg-allura-bg/80 border border-allura-border/60 rounded-xl p-4 text-xs font-sans space-y-2 text-allura-text">
              <p className="font-bold uppercase tracking-wider text-[10px] text-allura-goldDark">Installation Steps:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-allura-muted">
                <li>Open Safari's <span className="font-semibold text-allura-text">Share</span> button.</li>
                <li>Select <span className="font-semibold text-allura-text">Add to Home Screen</span>.</li>
                <li>Open <span className="font-semibold text-allura-text">Allura Boutique</span> using the Home Screen icon.</li>
                <li>Log in to your account.</li>
                <li>Tap <span className="font-semibold text-allura-text">Turn On Notifications</span>.</li>
              </ol>
            </div>
          </div>
        ) : pushStatus === 'denied' ? (
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <h3 className="font-serif text-sm font-medium text-allura-text">
                Notifications are blocked. Please enable them in your browser settings.
              </h3>
              <p className="text-xs font-sans text-allura-muted mt-0.5">
                Notifications were denied. Allow them in your browser or device site permissions.
              </p>
            </div>
          </div>
        ) : pushStatus === 'granted' ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h3 className="font-serif text-sm font-medium text-allura-text">Notifications Enabled</h3>
                <p className="text-xs font-sans text-allura-muted mt-0.5">
                  Live boutique updates on order delivery milestones and private releases are active.
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-xs font-sans font-semibold self-start sm:self-auto">
              <Check size={12} />
              <span>Notifications Enabled</span>
            </span>
          </div>
        ) : pushStatus === 'registration_failed' ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="font-serif text-sm font-medium text-allura-text">
                  Unable to register this device. Please try again.
                </h3>
                <p className="text-xs font-sans text-allura-muted mt-0.5">
                  The push service registration failed. Please verify your internet connection and retry.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={isEnablingPush}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-allura-darkBrown hover:bg-black text-white text-xs font-sans font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50 self-start sm:self-auto flex-shrink-0"
            >
              {isEnablingPush ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Enabling…</span>
                </>
              ) : (
                <>
                  <Bell size={14} />
                  <span>Turn On Notifications</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-allura-bgSecondary text-allura-gold flex items-center justify-center flex-shrink-0">
                <BellRing size={18} />
              </div>
              <div>
                <h3 className="font-serif text-base font-normal text-allura-text">Instant Order & Boutique Alerts</h3>
                <p className="text-xs font-sans text-allura-muted mt-0.5">
                  Enable push notifications to receive real-time updates on shipping milestones and private offers.
                </p>
              </div>
            </div>
            <button
              onClick={handleEnablePush}
              disabled={isEnablingPush}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-allura-darkBrown hover:bg-black text-white text-xs font-sans font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50 self-start sm:self-auto flex-shrink-0"
            >
              {isEnablingPush ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Enabling…</span>
                </>
              ) : (
                <>
                  <Bell size={14} />
                  <span>Turn On Notifications</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-allura-border/40">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-allura-darkBrown text-white shadow-xs'
                : 'bg-allura-card text-allura-muted hover:text-allura-text border border-allura-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {isLoadingNotifications && notifications.length === 0 ? (
        <div className="bg-allura-card border border-allura-border rounded-2xl p-12 text-center space-y-3 shadow-subtle">
          <Loader2 size={24} className="animate-spin text-allura-goldDark mx-auto" />
          <p className="text-xs font-sans text-allura-muted">Loading your notifications…</p>
        </div>
      ) : notificationsError ? (
        <div className="bg-allura-card border border-allura-border rounded-2xl p-12 text-center space-y-3 shadow-subtle">
          <AlertTriangle size={24} className="text-rose-500 mx-auto" />
          <p className="text-xs font-sans text-allura-muted">{notificationsError}</p>
          <button onClick={refreshNotifications} className="text-xs font-sans font-bold text-allura-goldDark underline">
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-allura-card border border-allura-border rounded-2xl p-12 text-center space-y-3 shadow-subtle">
          <div className="w-12 h-12 rounded-full bg-allura-bgSecondary text-allura-goldDark flex items-center justify-center mx-auto">
            <Bell size={24} />
          </div>
          <h3 className="font-serif text-lg text-allura-text">
            {activeCategory === 'All' ? 'No notifications yet' : 'No notifications in this category'}
          </h3>
          <p className="text-xs font-sans text-allura-muted">You are up to date with all your boutique activities.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => {
            const view = formatCustomerNotificationView(notif);
            const targetUrl = view.actionUrl || notif.actionUrl;
            return (
              <div
                key={notif.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                  notif.isRead
                    ? 'bg-allura-card border-allura-border/60 text-allura-muted'
                    : 'bg-white border-allura-gold/40 shadow-xs text-allura-text'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-allura-bgSecondary/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                    {getIcon(notif.category)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-serif text-base font-normal text-allura-text">
                        {view.title}
                      </h4>
                      {!notif.isRead && (
                        <span className="w-2 h-2 rounded-full bg-allura-gold" />
                      )}
                    </div>
                    <p className="text-xs font-sans text-allura-muted leading-relaxed">
                      {view.message}
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[10px] font-sans text-allura-muted/70">
                        {notif.timestamp}
                      </span>
                      {targetUrl && (
                        <Link
                          to={targetUrl}
                          className="text-[11px] font-sans font-bold text-allura-goldDark hover:underline inline-flex items-center gap-1"
                        >
                          <span>{notif.actionLabel || 'View Details'}</span>
                          <ArrowRight size={11} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 mt-0.5">
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={() => markNotificationAsRead(notif.id)}
                      title="Mark as read"
                      aria-label="Mark as read"
                      className="p-1.5 text-allura-muted hover:text-emerald-700 transition-colors rounded-lg hover:bg-allura-bgSecondary/60"
                    >
                      <Check size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(notif.id)}
                    disabled={deletingId === notif.id}
                    title="Delete notification"
                    aria-label="Delete notification"
                    className="p-1.5 text-allura-muted hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50 disabled:opacity-50"
                  >
                    {deletingId === notif.id ? (
                      <Loader2 size={16} className="animate-spin text-rose-500" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
