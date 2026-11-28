import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Eye,
  // Truck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  Bell,
  BellOff,
} from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { getAdminOrders, toBackendStatus, orderErrorMessage } from '../../service/orders';
import { getDashboardOrders, type OrdersSummaryResponse } from '../../service/adminDashboard';
import type { Order, OrderStatus } from '../../types';
import { useAdminOrderCatalog } from '../../hooks/useAdminOrderCatalog';
import { usePermissions } from '../../hooks/usePermissions';
import { OrderQuickStatusMenu } from '../../components/admin/OrderQuickStatusMenu';
import { OrderStatusBadgeMenu, ORDER_STATUS_PILL_SIZE } from '../../components/admin/OrderStatusBadgeMenu';
import { ENABLE_ORDER_ROW_ACTIONS, ENABLE_STATUS_BADGE_MENU } from '../../config/orderStatusFlags';
import { PaymentReminderModal } from '../../components/admin/PaymentReminderModal';
import { BulkSlipBar } from '../../components/admin/BulkSlipBar';

const CLOSED_ORDER_STATUSES: OrderStatus[] = ['Cancelled', 'Returned', 'Refunded'];
/** Pending-payment orders (Phase B) show "Remind" instead of "Manage". */
const needsPaymentReminder = (order: Order) =>
  order.paymentStatus === 'Pending' && !CLOSED_ORDER_STATUSES.includes(order.orderStatus);

const PAGE_SIZE = 20;

// Frontend-only cooldown: the backend doesn't enforce a reminder rate limit
// (no 429 documented for /admin/notifications/send), so this is purely a UX
// guard against accidental repeat clicks, not a server-side rule.
const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const reminderStorageKey = (orderId: string) => `allura_payment_reminder_${orderId}`;
const getStoredReminderAt = (orderId: string): string | null => {
  try {
    return localStorage.getItem(reminderStorageKey(orderId));
  } catch {
    return null;
  }
};

export const AdminOrdersPage: React.FC = () => {
  const { can } = usePermissions();
  const canViewOrders = can('order_processing', 'view');
  const canEditOrders = can('order_processing', 'edit');
  const [rawOrders, setOrders] = useState<Order[]>([]);
  const withCatalog = useAdminOrderCatalog();
  const orders = React.useMemo(() => rawOrders.map(withCatalog), [rawOrders, withCatalog]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<OrdersSummaryResponse | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Phase B: Remind button + modal. Keyed by order id; the backend doesn't
  // return a lastReminderAt on the order object, so the 24h cooldown below is
  // tracked client-side only, in localStorage (survives refresh, per-browser).
  const [reminderOrder, setReminderOrder] = useState<Order | null>(null);
  const [remindersSent, setRemindersSent] = useState<Record<string, string>>({});

  // Bulk address-slip printing: selection is this page's rows only, cleared on
  // page/filter/search change since there's no cross-page selection here.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelected = (orderId: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  const allCurrentSelected = orders.length > 0 && orders.every(o => selectedIds.has(o.id));
  const toggleSelectAll = () =>
    setSelectedIds(prev => {
      if (allCurrentSelected) {
        const next = new Set(prev);
        orders.forEach(o => next.delete(o.id));
        return next;
      }
      const next = new Set(prev);
      orders.forEach(o => next.add(o.id));
      return next;
    });

  useEffect(() => {
    setRemindersSent(prev => {
      let changed = false;
      const next = { ...prev };
      orders.forEach(o => {
        if (next[o.id]) return;
        const stored = getStoredReminderAt(o.id);
        if (stored) {
          next[o.id] = stored;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [orders]);

  const handleReminderSent = (orderId: string, lastReminderAt: string) => {
    try {
      localStorage.setItem(reminderStorageKey(orderId), lastReminderAt);
    } catch {
      // localStorage unavailable (private mode, etc.) — cooldown just won't persist.
    }
    setRemindersSent(prev => ({ ...prev, [orderId]: lastReminderAt }));
    setReminderOrder(null);
  };

  const isReminderOnCooldown = (orderId: string): boolean => {
    const sentAt = remindersSent[orderId];
    if (!sentAt) return false;
    return Date.now() - new Date(sentAt).getTime() < REMINDER_COOLDOWN_MS;
  };

  const statuses: ('All' | OrderStatus)[] = [
    'All',
    'Pending',
    'Confirmed',
    'Processing',
    'Shipped',
    'Delivered',
    'Cancelled',
    'Returned',
  ];

  // Search is sent to the server; wait until typing pauses
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [result, summaryResult] = await Promise.all([
        getAdminOrders({
          page,
          limit: PAGE_SIZE,
          status: statusFilter === 'All' ? undefined : toBackendStatus(statusFilter),
          search: search || undefined,
        }),
        getDashboardOrders().catch(() => null),
      ]);
      setOrders(result.orders);
      setTotal(result.total);
      if (summaryResult) setSummary(summaryResult);
    } catch (err) {
      setError(orderErrorMessage(err, 'Failed to load orders'));
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Clear the bulk-print selection whenever the visible rows change underneath it
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            OPERATIONS & FULFILLMENT
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Customer Orders ({total})
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Confirm, pack and ship orders, and manage cancellations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={isLoading}
            className="p-2.5 border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          {/* {canViewOrders && (
            <Link
              to="/admin/shipping"
              className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Truck size={14} />
              <span>Shipping Dispatch Hub</span>
            </Link>
          )} */}
        </div>
      </div>

      {/* Summary & Attention Required Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-stone-400">Total Volume</span>
            <p className="font-serif text-2xl font-bold text-[#561C08]">{summary.pagination.total}</p>
            <p className="text-[11px] text-stone-500 font-sans">Across all channels</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-amber-700">
              <span className="text-[10px] font-bold uppercase">Pending Processing</span>
              <AlertCircle size={14} />
            </div>
            <p className="font-serif text-2xl font-bold text-amber-800">
              {summary.attentionRequired.pendingProcessing}
            </p>
            <p className="text-[11px] text-amber-700 font-sans">Requires atelier packing</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-stone-500">
              <span className="text-[10px] font-bold uppercase">Awaiting Payment</span>
              <Clock size={14} />
            </div>
            <p className="font-serif text-2xl font-bold text-[#561C08]">
              {summary.attentionRequired.pendingPayment}
            </p>
            <p className="text-[11px] text-stone-500 font-sans">Checkout incomplete</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[10px] font-bold uppercase">Delivered</span>
              <CheckCircle2 size={14} />
            </div>
            <p className="font-serif text-2xl font-bold text-emerald-800">
              {summary.countsByStatus?.['DELIVERED'] ?? 0}
            </p>
            <p className="text-[11px] text-emerald-700 font-sans">Successfully received</p>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by order #, customer, or phone..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans text-stone-900 focus:outline-none focus:border-stone-800"
            />
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-t border-stone-100 pt-3">
          {statuses.map(st => {
            const count = st === 'All'
              ? (summary?.pagination.total ?? total)
              : summary?.countsByStatus?.[st.toUpperCase()];

            return (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5 ${statusFilter === st
                  ? 'bg-[#561C08] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
              >
                <span>{st}</span>
                {typeof count === 'number' && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${statusFilter === st ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
                    }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchOrders} className="font-bold underline">Retry</button>
        </div>
      )}

      {canViewOrders && selectedIds.size > 0 && (
        <BulkSlipBar orderIds={Array.from(selectedIds)} onClear={() => setSelectedIds(new Set())} />
      )}

      {/* Orders Table */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left text-xs font-sans border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                {canViewOrders && (
                  <th className="p-4 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all orders on this page"
                      checked={allCurrentSelected}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-stone-300 accent-[#561C08]"
                    />
                  </th>
                )}
                <th className="p-4">Order Number & Date</th>
                <th className="p-4">Customer & City</th>
                <th className="p-4">Items / SKU</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Payment</th>
                <th className="p-4 w-[150px]">Order Status</th>
                <th className="p-4">Shipment</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {isLoading && orders.length === 0 ? (
                <tr>
                  <td colSpan={canViewOrders ? 9 : 8} className="p-10 text-center text-stone-400">Loading orders…</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={canViewOrders ? 9 : 8} className="p-10 text-center text-stone-400">
                    {search || statusFilter !== 'All' ? 'No orders match these filters.' : 'No orders yet.'}
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/70 transition-colors">
                    {canViewOrders && (
                      <td className="p-4" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select order ${order.orderNumber}`}
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelected(order.id)}
                          className="h-3.5 w-3.5 rounded border-stone-300 accent-[#561C08]"
                        />
                      </td>
                    )}
                    <td className="p-4">
                      {needsPaymentReminder(order) ? (
                        <Link to={`/admin/orders/${order.id}`} className="font-serif text-sm font-bold text-stone-900 hover:text-[#561C08] hover:underline">
                          {order.orderNumber}
                        </Link>
                      ) : (
                        <p className="font-serif text-sm font-bold text-stone-900">{order.orderNumber}</p>
                      )}
                      <p className="text-[10px] text-stone-400">{order.date}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-stone-800">{order.customer.name}</p>
                      {(order.shippingAddress.city || order.shippingAddress.state) && (
                        <p className="text-[10px] text-stone-400">
                          {[order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <p className="text-[10px] text-stone-400">{order.customer.phone}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-stone-800 truncate max-w-[180px]">
                        {order.items[0]?.product.name || '—'}
                      </p>
                      {order.items.length > 0 && (
                        <p className="text-[10px] text-stone-400 font-mono">
                          {order.items[0]?.sku} ({order.items.length} item{order.items.length > 1 ? 's' : ''})
                        </p>
                      )}
                    </td>
                    <td className="p-4 font-bold text-[#561C08]">
                      ₹ {order.total.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-stone-700">{order.paymentMethod}</span>
                      <p className={`text-[10px] font-medium ${order.paymentStatus === 'Paid' || order.paymentStatus === 'Captured' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {order.paymentStatus}
                      </p>
                    </td>
                    <td className="p-4 w-[150px]">
                      {canEditOrders && ENABLE_ORDER_ROW_ACTIONS && ENABLE_STATUS_BADGE_MENU ? (
                        <OrderStatusBadgeMenu order={order} onChanged={fetchOrders} />
                      ) : (
                        <StatusBadge status={order.orderStatus} size="sm" fixedSize={ORDER_STATUS_PILL_SIZE} />
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-stone-700 font-medium">{order.tracking?.courier || '—'}</p>
                      <p className="font-mono text-[10px] text-stone-400">{order.tracking?.awb || 'Not shipped'}</p>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {needsPaymentReminder(order) ? (
                          canEditOrders ? (
                            isReminderOnCooldown(order.id) ? (
                              <button
                                type="button"
                                disabled
                                title={`Reminder sent at ${new Date(remindersSent[order.id]).toLocaleString('en-IN')}`}
                                className="px-3 py-1.5 bg-stone-200 text-stone-500 rounded-lg font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 cursor-not-allowed"
                              >
                                <BellOff size={12} />
                                <span>Reminder sent</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setReminderOrder(order)}
                                className="px-3 py-1.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-lg font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 shadow-xs"
                              >
                                <Bell size={12} />
                                <span>Remind</span>
                              </button>
                            )
                          ) : canViewOrders ? (
                            <Link
                              to={`/admin/orders/${order.id}`}
                              className="px-3 py-1.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-lg font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 shadow-xs"
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </Link>
                          ) : null
                        ) : canViewOrders ? (
                          <Link
                            to={`/admin/orders/${order.id}`}
                            className="px-3 py-1.5 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-lg font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1 shadow-xs"
                          >
                            <Eye size={12} />
                            <span>Manage</span>
                          </Link>
                        ) : null}
                        {canEditOrders && ENABLE_ORDER_ROW_ACTIONS && !ENABLE_STATUS_BADGE_MENU && (
                          <OrderQuickStatusMenu order={order} onChanged={fetchOrders} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 text-xs font-sans text-stone-500">
            <span>
              Page {page} of {totalPages} · {total} orders
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || isLoading}
                className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || isLoading}
                className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <PaymentReminderModal
        order={reminderOrder}
        onClose={() => setReminderOrder(null)}
        onSent={handleReminderSent}
        onError={fetchOrders}
      />
    </div>
  );
};
