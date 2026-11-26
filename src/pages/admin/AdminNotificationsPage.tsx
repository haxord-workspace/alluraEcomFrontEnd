import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Mail,
  Smartphone,
  MessageCircle,
  Bell,
  Loader2,
  Radio,
  Copy,
  Check,
  SlidersHorizontal,
  ExternalLink,
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAdmin } from '../../context/AdminContext';
import { getDashboardNotifications, type NotificationAnalyticsResponse } from '../../service/adminDashboard';
import {
  getAdminNotifications,
  getAdminNotification,
  retryNotification,
  notificationErrorMessage,
  type AdminNotificationListParams,
} from '../../service/notifications';
import { BroadcastModal } from '../../components/admin/BroadcastModal';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { AdminPagination } from '../../components/admin/AdminPagination';
import type { Notification, NotificationStatus, BusinessEvent, NotificationChannel } from '../../types/notification';

const PAGE_SIZE = 20;

// Confirmed enum values, from GET /admin/notifications's query-param schema
const STATUSES: ('All' | NotificationStatus)[] = ['All', 'PENDING', 'QUEUED', 'SENT', 'FAILED', 'PARTIALLY_SENT'];
const BUSINESS_EVENTS: ('All' | BusinessEvent)[] = [
  'All',
  'ORDER_CREATED',
  'ORDER_STATUS_UPDATED',
  'ORDER_CANCELLED',
  'PAYMENT_RECEIVED',
  'PAYMENT_REMINDER',
  'ABANDONED_CART_REMINDER',
  'WELCOME_CUSTOMER',
  'MARKETING_BROADCAST',
  'DIRECT_MESSAGE',
  'NEW_CUSTOMER_REGISTERED',
  'NEW_ORDER_RECEIVED',
  'LOW_STOCK_ALERT',
  'PAYMENT_FAILURE_ALERT',
  'INTEGRATION_FAILURE_ALERT',
];

const BUSINESS_EVENT_LABELS: Partial<Record<BusinessEvent, string>> = {
  ORDER_CREATED: 'Order Created',
  ORDER_STATUS_UPDATED: 'Order Status Updated',
  ORDER_CANCELLED: 'Order Cancelled',
  PAYMENT_RECEIVED: 'Payment Received',
  PAYMENT_REMINDER: 'Payment Reminder',
  ABANDONED_CART_REMINDER: 'Abandoned Cart Reminder',
  WELCOME_CUSTOMER: 'Welcome Customer',
  MARKETING_BROADCAST: 'Marketing Broadcast',
  DIRECT_MESSAGE: 'Direct Message',
  NEW_CUSTOMER_REGISTERED: 'New Customer Registered',
  NEW_ORDER_RECEIVED: 'New Order Received',
  LOW_STOCK_ALERT: 'Low Stock Alert',
  PAYMENT_FAILURE_ALERT: 'Payment Failure Alert',
  INTEGRATION_FAILURE_ALERT: 'Integration Failure Alert',
};

/** e.g. "NEW_ORDER_RECEIVED" -> "New Order Received"; unknown future values are title-cased instead of guessed. */
const businessEventLabel = (ev: string): string => {
  if (ev === 'All') return 'All types';
  const known = BUSINESS_EVENT_LABELS[ev as BusinessEvent];
  if (known) return known;
  return ev
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');
};

const ChannelIcon: React.FC<{ channel: NotificationChannel }> = ({ channel }) => {
  if (channel === 'PUSH' || channel === 'FCM') return <Smartphone size={12} />;
  if (channel === 'WHATSAPP') return <MessageCircle size={12} />;
  return <Mail size={12} />;
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
};

const formatCurrencyAmount = (amount: unknown, currency: unknown): string => {
  const value = typeof amount === 'number' ? amount : Number(amount);
  if (Number.isNaN(value)) return String(amount ?? '—');
  const symbol = String(currency || 'INR').toUpperCase() === 'INR' ? '₹' : `${currency} `;
  return `${symbol} ${value.toLocaleString('en-IN')}`;
};

/** Keys already surfaced by dedicated UI (title/message/actionUrl/actionLabel for DIRECT_MESSAGE,
 *  orderNumber/status/totalAmount/currency/customerName for order/payment events). */
const KNOWN_PAYLOAD_KEYS = new Set([
  'title',
  'message',
  'actionUrl',
  'actionLabel',
  'orderNumber',
  'status',
  'totalAmount',
  'currency',
  'customerName',
]);

const humanizeKey = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, c => c.toUpperCase());

const CopyIconButton: React.FC<{ value: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard unavailable (insecure context, permissions) — silently no-op.
        }
      }}
      title="Copy to clipboard"
      className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
    >
      {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
    </button>
  );
};

export const AdminNotificationsPage: React.FC = () => {
  const { showToast } = useShop();
  const { hasPermission } = useAdmin();
  const canCreateAlert = hasPermission('push_email_alerts', 'create');
  const canSend = canCreateAlert;

  const [searchParams, setSearchParams] = useSearchParams();
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [queueMetrics, setQueueMetrics] = useState<NotificationAnalyticsResponse | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<'All' | NotificationStatus>('All');

  const [recipientInput, setRecipientInput] = useState('');
  const [recipientId, setRecipientId] = useState('');

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [eventDraft, setEventDraft] = useState<'All' | BusinessEvent>('All');
  const [fromDraft, setFromDraft] = useState('');
  const [toDraft, setToDraft] = useState('');
  const [eventFilter, setEventFilter] = useState<'All' | BusinessEvent>('All');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Notification | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const hasActiveAdvancedFilters = eventFilter !== 'All' || !!from || !!to;

  const fetchQueueMetrics = useCallback(async () => {
    try {
      setQueueMetrics(await getDashboardNotifications());
    } catch (err) {
      console.warn('Could not load notification queue metrics:', err);
    }
  }, []);

  // Recipient ID is sent to the server; wait until typing pauses
  useEffect(() => {
    const t = setTimeout(() => {
      setRecipientId(recipientInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [recipientInput]);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: AdminNotificationListParams = {
        page,
        limit: PAGE_SIZE,
        status: statusFilter === 'All' ? undefined : statusFilter,
        businessEvent: eventFilter === 'All' ? undefined : eventFilter,
        recipientId: recipientId || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      };
      const result = await getAdminNotifications(params);
      setNotifications(result.notifications);
      setTotal(result.meta.total);
    } catch (err) {
      setError(notificationErrorMessage(err, 'Failed to load notifications'));
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, eventFilter, recipientId, from, to]);

  useEffect(() => {
    fetchQueueMetrics();
  }, [fetchQueueMetrics]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const applyAdvancedFilters = () => {
    setEventFilter(eventDraft);
    setFrom(fromDraft);
    setTo(toDraft);
    setPage(1);
  };

  const resetAdvancedFilters = () => {
    setEventDraft('All');
    setFromDraft('');
    setToDraft('');
    setEventFilter('All');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    setIsDetailLoading(true);
    try {
      setDetail(await getAdminNotification(id));
    } catch (err) {
      setDetailError(notificationErrorMessage(err, 'Could not load this notification'));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    if (searchParams.has('id')) {
      searchParams.delete('id');
      setSearchParams(searchParams, { replace: true });
    }
  };

  // Deep link from the admin bell dropdown: /admin/notifications?id=<id>
  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl && idFromUrl !== selectedId) {
      openDetail(idFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleRetry = async () => {
    if (!selectedId) return;
    setIsRetrying(true);
    try {
      const updated = await retryNotification(selectedId);
      if (updated) setDetail(updated);
      else await openDetail(selectedId);
      showToast('Retry enqueued for the failed channels', 'success');
      fetchNotifications();
    } catch (err) {
      showToast(notificationErrorMessage(err, 'Could not retry this notification'), 'error');
    } finally {
      setIsRetrying(false);
    }
  };

  const canRetry = canCreateAlert && (detail?.status === 'FAILED' || detail?.status === 'PARTIALLY_SENT');

  const relatedEntityHref = (n: Pick<Notification, 'relatedEntityType' | 'relatedEntityId'>): string | undefined => {
    if (!n.relatedEntityId) return undefined;
    if (n.relatedEntityType === 'ORDER') return `/admin/orders/${n.relatedEntityId}`;
    return undefined;
  };

  const detailPayloadExtras = detail
    ? Object.entries(detail.payload).filter(([key, value]) => !KNOWN_PAYLOAD_KEYS.has(key) && value !== undefined && value !== null)
    : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            OMNICHANNEL BROADCAST
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Notifications & Messaging Hub
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Delivery tracking across Email, WhatsApp and Push, with per-notification retry.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {canSend && (
            <button
              onClick={() => setIsBroadcastOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-xs"
            >
              <Radio size={14} />
              <span>Broadcast</span>
            </button>
          )}
          <button
            onClick={() => {
              fetchQueueMetrics();
              fetchNotifications();
            }}
            disabled={isLoading}
            className="p-2 border border-stone-200 hover:border-stone-400 rounded-xl bg-white text-stone-600 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
        onSent={fetchNotifications}
      />

      {/* Queue status & supported channels */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Dispatch Queue</span>
          <StatusBadge status={queueMetrics?.queueStatus || 'ONLINE'} size="sm" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(queueMetrics?.channelsSupported ?? ['EMAIL']).map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-600 rounded-full text-[10px] font-sans font-semibold"
            >
              <ChannelIcon channel={c} />
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Queue & Delivery Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[10px] font-sans font-bold uppercase">Waiting</span>
            <Clock size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-stone-800">{queueMetrics?.counts.waiting ?? 0}</p>
          <p className="text-[11px] text-stone-500 font-sans">Queued, not yet picked up</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[10px] font-sans font-bold uppercase">Active</span>
            <Loader2 size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-[#561C08]">{queueMetrics?.counts.active ?? 0}</p>
          <p className="text-[11px] text-stone-500 font-sans">Dispatching right now</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-[10px] font-sans font-bold uppercase">Failed</span>
            <AlertTriangle size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-rose-800">{queueMetrics?.counts.failed ?? 0}</p>
          <p className="text-[11px] text-rose-700 font-sans">Undelivered alerts</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[10px] font-sans font-bold uppercase">Completed</span>
            <CheckCircle2 size={14} />
          </div>
          <p className="font-serif text-2xl font-bold text-emerald-800">{queueMetrics?.counts.completed ?? 0}</p>
          <p className="text-[11px] text-emerald-700 font-sans">Delivered messages</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="w-full sm:w-80">
            <input
              type="text"
              value={recipientInput}
              onChange={e => setRecipientInput(e.target.value)}
              placeholder="Search by recipient ID..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-sans font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              showAdvanced || hasActiveAdvancedFilters
                ? 'bg-[#561C08] text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Advanced Filters</span>
            {hasActiveAdvancedFilters && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
          </button>
        </div>

        {/* Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-t border-stone-100 pt-3">
          {STATUSES.map(st => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-[#561C08] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {st === 'All' ? 'All' : String(st).replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        {showAdvanced && (
          <div className="border-t border-stone-100 pt-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase text-stone-400 mb-1">Type</label>
                <select
                  value={eventDraft}
                  onChange={e => setEventDraft(e.target.value as 'All' | BusinessEvent)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
                >
                  {BUSINESS_EVENTS.map(ev => (
                    <option key={ev} value={ev}>{businessEventLabel(ev)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase text-stone-400 mb-1">From</label>
                <input
                  type="date"
                  value={fromDraft}
                  onChange={e => setFromDraft(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-sans font-bold uppercase text-stone-400 mb-1">To</label>
                <input
                  type="date"
                  value={toDraft}
                  onChange={e => setToDraft(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={applyAdvancedFilters}
                className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors"
              >
                Apply
              </button>
              <button
                onClick={resetAdvancedFilters}
                className="px-4 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {hasActiveAdvancedFilters && (
          <div className="flex flex-wrap gap-2 border-t border-stone-100 pt-3">
            {eventFilter !== 'All' && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-sans font-semibold">
                Type: {businessEventLabel(eventFilter)}
              </span>
            )}
            {from && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-sans font-semibold">From: {from}</span>
            )}
            {to && (
              <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 text-[10px] font-sans font-semibold">To: {to}</span>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchNotifications} className="font-bold underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                <th className="p-4">Notification</th>
                <th className="p-4">Recipient</th>
                <th className="p-4">Channels</th>
                <th className="p-4">Status</th>
                <th className="p-4">Read</th>
                <th className="p-4">Sent</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400">Loading notifications…</td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-stone-400">No notifications match these filters.</td>
                </tr>
              ) : (
                notifications.map(n => {
                  const href = relatedEntityHref(n);
                  return (
                    <tr key={n.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4 max-w-[260px]">
                        <p className="font-semibold text-stone-900 truncate">{n.displayTitle || businessEventLabel(String(n.businessEvent))}</p>
                        {n.displayMessage && (
                          <p className="text-[10px] text-stone-400 truncate">{n.displayMessage}</p>
                        )}
                        <p className="text-[10px] text-stone-400 mt-0.5">{businessEventLabel(String(n.businessEvent))}</p>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-stone-800">{n.recipient.name || n.recipient.email || '—'}</p>
                        <p className="text-[10px] text-stone-400">{n.recipient.email}</p>
                        <p className="text-[10px] text-stone-400 uppercase">{n.recipientType}</p>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1.5 text-stone-500">
                          {n.channels.map((c, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-stone-100 rounded-md" title={c}>
                              <ChannelIcon channel={c} />
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={n.status} size="sm" />
                      </td>
                      <td className="p-4">
                        {n.isRead ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-medium">
                            <CheckCircle2 size={12} /> Read
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-stone-400 text-[11px] font-medium">
                            <Bell size={12} /> Unread
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-stone-500 whitespace-nowrap">{formatDateTime(n.createdAt)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {href && (
                            <Link
                              to={href}
                              className="p-1.5 border border-stone-200 rounded-lg text-stone-500 hover:text-stone-800 hover:border-stone-400"
                              title={`Open related ${n.relatedEntityType?.toLowerCase()}`}
                            >
                              <ExternalLink size={12} />
                            </Link>
                          )}
                          <button
                            onClick={() => openDetail(n.id)}
                            className="px-3 py-1.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-lg font-bold text-xs uppercase tracking-wider"
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination currentPage={page} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      </div>

      {/* Detail drawer */}
      <Modal
        open={!!selectedId}
        onClose={closeDetail}
        isBusy={isRetrying}
        isDirty={false}
        backdropClassName="fixed inset-0 z-50 flex justify-end bg-stone-900/50 backdrop-blur-sm animate-fade-in"
        panelClassName="relative bg-white h-full w-full max-w-md shadow-2xl flex flex-col focus:outline-none"
        closeButtonClassName="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-40"
        labelledBy="notification-detail-title"
      >
        {selectedId && (
          <>
            <div className="flex items-center justify-between p-5 pr-14 border-b border-stone-100 flex-shrink-0">
              <h3 id="notification-detail-title" className="font-serif text-xl text-stone-900">Notification Detail</h3>
            </div>

            <div className="p-5 space-y-5 text-xs font-sans overflow-y-auto flex-1">
              {isDetailLoading ? (
                <div className="flex flex-col items-center gap-2 py-10 text-stone-400">
                  <Loader2 size={22} className="animate-spin" />
                  <span>Loading…</span>
                </div>
              ) : detailError ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">{detailError}</div>
              ) : detail ? (
                <>
                  {/* Overview */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-bold uppercase text-stone-400">Overview</h4>
                    <p className="font-serif text-base text-stone-900">{detail.displayTitle || '—'}</p>
                    {detail.displayMessage && <p className="text-stone-600">{detail.displayMessage}</p>}
                    <div className="flex justify-between">
                      <span className="text-stone-400">Type</span>
                      <span className="font-semibold text-stone-900">{businessEventLabel(String(detail.businessEvent))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400">Status</span>
                      <StatusBadge status={detail.status} size="sm" />
                    </div>
                    <div className="flex justify-between flex-wrap gap-1.5">
                      <span className="text-stone-400">Channels</span>
                      <div className="flex gap-1.5">
                        {detail.channels.map((c, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 rounded-full text-stone-700">
                            <ChannelIcon channel={c} />
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    {detail.templateCode && (
                      <div className="flex justify-between">
                        <span className="text-stone-400">Template</span>
                        <span className="font-mono text-[11px] text-stone-700">{detail.templateCode}</span>
                      </div>
                    )}
                    {detail.failureReason && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                        <p className="text-[10px] font-bold uppercase text-rose-700">Failure Reason</p>
                        <p className="text-rose-800">{detail.failureReason}</p>
                      </div>
                    )}
                  </div>

                  {/* Recipient */}
                  <div className="space-y-2 border-t border-stone-100 pt-4">
                    <h4 className="text-[10px] font-bold uppercase text-stone-400">Recipient</h4>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Name</span>
                      <span className="font-semibold text-stone-900">{detail.recipient.name || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Email</span>
                      <span className="text-stone-700">{detail.recipient.email || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400">Recipient ID</span>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-stone-700">
                        {detail.recipientId || '—'}
                        <CopyIconButton value={detail.recipientId} />
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Recipient Type</span>
                      <span className="text-stone-700 uppercase">{detail.recipientType}</span>
                    </div>
                  </div>

                  {/* Payload */}
                  <div className="space-y-2 border-t border-stone-100 pt-4">
                    <h4 className="text-[10px] font-bold uppercase text-stone-400">Payload</h4>
                    {detail.payload.orderNumber && (
                      <div className="flex justify-between">
                        <span className="text-stone-400">Order</span>
                        <span className="font-semibold text-stone-900">{detail.payload.orderNumber}</span>
                      </div>
                    )}
                    {detail.payload.customerName && (
                      <div className="flex justify-between">
                        <span className="text-stone-400">Customer</span>
                        <span className="text-stone-700">{detail.payload.customerName}</span>
                      </div>
                    )}
                    {detail.payload.status && (
                      <div className="flex justify-between">
                        <span className="text-stone-400">Order Status</span>
                        <span className="text-stone-700">{detail.payload.status}</span>
                      </div>
                    )}
                    {detail.payload.totalAmount !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-stone-400">Amount</span>
                        <span className="font-bold text-[#561C08]">
                          {formatCurrencyAmount(detail.payload.totalAmount, detail.payload.currency)}
                        </span>
                      </div>
                    )}
                    {detail.payload.actionUrl && (
                      <a
                        href={detail.payload.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full text-center px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold uppercase tracking-wider transition-colors"
                      >
                        {detail.payload.actionLabel || 'Open Link'}
                      </a>
                    )}
                    {detailPayloadExtras.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        {detailPayloadExtras.map(([key, value]) => (
                          <div key={key} className="flex justify-between gap-3">
                            <span className="text-stone-400">{humanizeKey(key)}</span>
                            <span className="text-stone-700 text-right break-all">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {!detail.payload.orderNumber &&
                      !detail.payload.customerName &&
                      !detail.payload.totalAmount &&
                      !detail.payload.actionUrl &&
                      detailPayloadExtras.length === 0 && <p className="text-stone-400">No payload data.</p>}
                  </div>

                  {/* Related entity */}
                  {detail.relatedEntityType && (
                    <div className="space-y-2 border-t border-stone-100 pt-4">
                      <h4 className="text-[10px] font-bold uppercase text-stone-400">Related Entity</h4>
                      <div className="flex justify-between items-center">
                        <span className="text-stone-400">Type</span>
                        <span className="text-stone-700 uppercase">{detail.relatedEntityType}</span>
                      </div>
                      {detail.relatedEntityId && (
                        <div className="flex justify-between items-center">
                          <span className="text-stone-400">ID</span>
                          {relatedEntityHref(detail) ? (
                            <Link to={relatedEntityHref(detail)!} className="flex items-center gap-1 font-mono text-[11px] text-[#561C08] hover:underline">
                              {detail.relatedEntityId}
                              <ExternalLink size={11} />
                            </Link>
                          ) : (
                            <span className="flex items-center gap-1 font-mono text-[11px] text-stone-700">
                              {detail.relatedEntityId}
                              <CopyIconButton value={detail.relatedEntityId} />
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tracking */}
                  <div className="space-y-2 border-t border-stone-100 pt-4">
                    <h4 className="text-[10px] font-bold uppercase text-stone-400">Tracking</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-stone-400">Notification ID</span>
                      <span className="flex items-center gap-1 font-mono text-[11px] text-stone-700">
                        {detail.id}
                        <CopyIconButton value={detail.id} />
                      </span>
                    </div>
                    {detail.dedupeKey && (
                      <div className="flex justify-between items-center">
                        <span className="text-stone-400">Dedupe Key</span>
                        <span className="flex items-center gap-1 font-mono text-[11px] text-stone-700 text-right break-all">
                          {detail.dedupeKey}
                          <CopyIconButton value={detail.dedupeKey} />
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-stone-400">Read</span>
                      <span className="text-stone-700">{detail.isRead ? `Yes · ${formatDateTime(detail.readAt)}` : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Created</span>
                      <span className="text-stone-700">{formatDateTime(detail.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-400">Updated</span>
                      <span className="text-stone-700">{formatDateTime(detail.updatedAt)}</span>
                    </div>
                  </div>

                  {canRetry && (
                    <button
                      onClick={handleRetry}
                      disabled={isRetrying}
                      title="Only retries the channels that failed — a channel that already succeeded is never re-sent"
                      className="w-full px-5 py-2.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isRetrying && <Loader2 size={13} className="animate-spin" />}
                      <span>{isRetrying ? 'Retrying…' : 'Retry Failed Channels'}</span>
                    </button>
                  )}
                </>
              ) : null}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};
