import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  Printer,
  User,
  Phone,
  Mail,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  getAdminOrder,
  updateAdminOrderStatus,
  cancelAdminOrder,
  toBackendStatus,
  prettyStatus,
  orderErrorMessage,
} from '../../service/orders';
import type { Order, OrderStatus } from '../../types';
import { useAdminOrderCatalog } from '../../hooks/useAdminOrderCatalog';

// The usual next step for each status
const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  Pending: { to: 'Confirmed', label: 'Confirm Order' },
  Confirmed: { to: 'Processing', label: 'Start Processing' },
  Processing: { to: 'Packed', label: 'Mark Packed' },
  Packed: { to: 'Shipped', label: 'Ship Order' },
  Shipped: { to: 'Out for Delivery', label: 'Out for Delivery' },
  'Out for Delivery': { to: 'Delivered', label: 'Mark Delivered' },
};

const ALL_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Returned',
  'Refunded',
];

const CANCEL_REASONS = [
  'Customer requested cancellation',
  'Item out of stock',
  'Payment not received',
  'Suspected fraud',
  'Address not serviceable',
  'Other',
];

const CARRIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ekart', 'Shiprocket', 'Other'];

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAdmin();
  const { showToast } = useShop();
  const canEdit = hasPermission('orders', 'edit');
  const canCancel = hasPermission('orders', 'cancel');

  const [rawOrder, setOrder] = useState<Order | null>(null);
  const withCatalog = useAdminOrderCatalog();
  const order = React.useMemo(() => (rawOrder ? withCatalog(rawOrder) : null), [rawOrder, withCatalog]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [statusNote, setStatusNote] = useState('');
  const [manualStatus, setManualStatus] = useState<OrderStatus | ''>('');

  // Ship dialog
  const [isShipOpen, setIsShipOpen] = useState(false);
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [customCarrier, setCustomCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  // Cancel dialog
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      setOrder(await getAdminOrder(id));
    } catch (err: any) {
      setLoadError(err?.response?.status === 404 ? 'not-found' : orderErrorMessage(err, 'Failed to load order'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Use the order returned by the API, or re-fetch when the response doesn't include it
  const applyResult = async (updated: Order | null) => {
    if (updated) setOrder(updated);
    else await fetchOrder();
  };

  const changeStatus = async (to: OrderStatus, extra: { trackingNumber?: string; shippingCarrier?: string } = {}) => {
    if (!order) return false;
    setIsUpdating(true);
    try {
      const updated = await updateAdminOrderStatus(order.id, {
        status: toBackendStatus(to),
        note: statusNote.trim() || undefined,
        ...extra,
      });
      await applyResult(updated);
      setStatusNote('');
      setManualStatus('');
      showToast(`Order ${order.orderNumber} is now ${to}`, 'success');
      return true;
    } catch (err) {
      showToast(orderErrorMessage(err, 'Could not update the order status'), 'error');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleShip = async () => {
    const shippingCarrier = carrier === 'Other' ? customCarrier.trim() : carrier;
    const ok = await changeStatus('Shipped', {
      trackingNumber: trackingNumber.trim() || undefined,
      shippingCarrier: shippingCarrier || undefined,
    });
    if (ok) {
      setIsShipOpen(false);
      setTrackingNumber('');
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    const reason = cancelReason === 'Other' ? cancelNote.trim() || 'Other' : cancelReason;
    setIsUpdating(true);
    try {
      const updated = await cancelAdminOrder(order.id, reason, cancelReason === 'Other' ? undefined : cancelNote.trim() || undefined);
      await applyResult(updated);
      setIsCancelOpen(false);
      setCancelNote('');
      showToast(`Order ${order.orderNumber} cancelled`, 'info');
    } catch (err) {
      showToast(orderErrorMessage(err, 'This order can no longer be cancelled'), 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading && !order) {
    return (
      <div className="p-12 flex flex-col items-center gap-3 text-stone-500">
        <div className="w-7 h-7 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-sans uppercase tracking-widest">Loading order…</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="font-serif text-2xl text-stone-900">
          {loadError && loadError !== 'not-found' ? 'Could not load order' : 'Order Not Found'}
        </h2>
        {loadError && loadError !== 'not-found' && <p className="text-xs text-rose-600">{loadError}</p>}
        <div className="flex justify-center gap-4">
          {loadError && loadError !== 'not-found' && (
            <button onClick={fetchOrder} className="text-xs font-sans text-stone-700 underline">Retry</button>
          )}
          <Link to="/admin/orders" className="text-xs font-sans text-allura-goldDark underline">
            Return to Orders
          </Link>
        </div>
      </div>
    );
  }

  const isClosed = ['Cancelled', 'Delivered', 'Returned', 'Refunded'].includes(order.orderStatus);
  const next = NEXT_STEP[order.orderStatus];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-sans text-stone-500 hover:text-stone-900 mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to All Orders</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-serif text-3xl text-stone-900 font-normal">
              {order.orderNumber}
            </h1>
            <StatusBadge status={order.rawStatus ? prettyStatus(order.rawStatus) : order.orderStatus} />
          </div>
          <p className="text-xs font-sans text-stone-500 mt-1">
            Placed on {order.date} • Customer: <strong>{order.customer.name}</strong>
            {order.customer.phone && <> ({order.customer.phone})</>}
          </p>
        </div>

        {/* Action Controls based on Status */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && next && (
            <button
              onClick={() => (next.to === 'Shipped' ? setIsShipOpen(true) : changeStatus(next.to))}
              disabled={isUpdating}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isUpdating ? <Loader2 size={14} className="animate-spin" /> : next.to === 'Shipped' && <Truck size={14} />}
              <span>{next.label}</span>
            </button>
          )}

          <button
            onClick={fetchOrder}
            disabled={isLoading}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-sans font-semibold flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Packing Slip</span>
          </button>

          {canCancel && !isClosed && (
            <button
              onClick={() => setIsCancelOpen(true)}
              className="px-3.5 py-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-sans font-semibold"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left 2 Cols: Items, Shipment, Status history */}
        <div className="lg:col-span-2 space-y-6">

          {/* Order items table */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-xl font-normal text-stone-900">Items in Order ({order.items.length})</h3>
            <div className="divide-y divide-stone-100">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                  <img
                    src={item.product.images.primary}
                    alt={item.product.name}
                    className="w-16 h-20 object-cover rounded-xl bg-stone-100 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1 text-xs font-sans">
                    <p className="font-serif text-base font-medium text-stone-900">{item.product.name}</p>
                    <p className="text-stone-500 font-mono">
                      SKU: <strong>{item.sku || '—'}</strong>
                      {item.selectedSize && <> • Size: {item.selectedSize}</>}
                      {item.selectedColor?.name && <> • Color: {item.selectedColor.name}</>}
                    </p>
                    <p className="font-bold text-stone-900">
                      ₹ {item.unitPrice.toLocaleString('en-IN')} × {item.quantity} = ₹ {(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipment card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
                <Truck size={18} className="text-allura-goldDark" />
                <span>Shipment</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400">Tracking Number</span>
                <p className="font-mono text-sm font-bold text-stone-900 mt-0.5">
                  {order.tracking?.awb || 'Not shipped yet'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400">Courier</span>
                <p className="font-medium text-stone-800 mt-0.5">{order.tracking?.courier || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400">Estimated Delivery</span>
                <p className="font-medium text-stone-800 mt-0.5">{order.tracking?.estimatedDelivery || '—'}</p>
              </div>
            </div>
          </div>

          {/* Status history & manual update */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900">Status History</h3>
            <div className="space-y-3">
              {order.activityHistory && order.activityHistory.length > 0 ? (
                order.activityHistory.map((act, i) => (
                  <div key={i} className="p-3 bg-stone-50 rounded-xl flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">{act.action}</p>
                      {act.note && <p className="text-stone-500 mt-0.5">{act.note}</p>}
                    </div>
                    <div className="text-right text-[10px] text-stone-400 whitespace-nowrap">
                      <p className="font-medium text-stone-700">{act.user}</p>
                      <p>{act.timestamp}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-stone-400">No status changes yet.</p>
              )}
            </div>

            {canEdit && !isClosed && (
              <div className="pt-3 border-t border-stone-100 space-y-2">
                <label className="block text-[10px] font-bold uppercase text-stone-400">Update Status</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={manualStatus}
                    onChange={e => setManualStatus(e.target.value as OrderStatus)}
                    className="sm:w-48 p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="">Choose status…</option>
                    {ALL_STATUSES.filter(s => s !== order.orderStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Note (optional, saved with the status change)"
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                  <button
                    onClick={() => {
                      if (!manualStatus) return;
                      if (manualStatus === 'Shipped') setIsShipOpen(true);
                      else changeStatus(manualStatus);
                    }}
                    disabled={!manualStatus || isUpdating}
                    className="px-4 py-2.5 bg-stone-900 text-white rounded-xl font-bold uppercase text-xs disabled:opacity-40"
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Col: Customer Details & Financial Breakdown */}
        <div className="space-y-6">

          {/* Customer info */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
              <User size={16} className="text-allura-goldDark" />
              <span>Customer</span>
            </h3>
            <div className="space-y-2 text-stone-600 leading-relaxed">
              <p className="font-bold text-stone-900 text-sm">{order.customer.name}</p>
              {order.customer.phone && (
                <p className="flex items-center gap-2">
                  <Phone size={13} className="text-stone-400" />
                  <span>{order.customer.phone}</span>
                </p>
              )}
              {order.customer.email && (
                <p className="flex items-center gap-2">
                  <Mail size={13} className="text-stone-400" />
                  <span>{order.customer.email}</span>
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Delivery Address</span>
              <p className="text-stone-800 leading-relaxed pt-1">
                {order.shippingAddress.fullName && <>{order.shippingAddress.fullName}<br /></>}
                {order.shippingAddress.addressLine1}
                {order.shippingAddress.addressLine2 && <>, {order.shippingAddress.addressLine2}</>}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}<br />
                {order.shippingAddress.country}
              </p>
            </div>
          </div>

          {/* Payment & Price breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900">Payment Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal:</span>
                <span>₹ {order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}:</span>
                  <span>-₹ {order.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Shipping:</span>
                <span>{order.shippingFee === 0 ? 'Free' : `₹ ${order.shippingFee.toLocaleString('en-IN')}`}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Tax:</span>
                <span>₹ {order.tax.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-base font-serif font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Amount:</span>
                <span className="text-allura-goldDark">₹ {order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl flex items-center justify-between border border-stone-200 text-[11px]">
              <span>{order.paymentMethod}</span>
              <strong className={order.paymentStatus === 'Paid' || order.paymentStatus === 'Captured' ? 'text-emerald-700' : 'text-amber-700'}>
                {order.paymentStatus}
              </strong>
            </div>
          </div>

        </div>

      </div>

      {/* Ship dialog */}
      {isShipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-xs font-sans">
            <h3 className="font-serif text-xl text-stone-900 flex items-center gap-2">
              <Truck size={18} className="text-allura-goldDark" /> Ship {order.orderNumber}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Courier</label>
                <select value={carrier} onChange={e => setCarrier(e.target.value)} className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                  {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-stone-500 mb-1">Tracking / AWB Number</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={e => setTrackingNumber(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>
            </div>
            {carrier === 'Other' && (
              <input
                type="text"
                placeholder="Courier name"
                value={customCarrier}
                onChange={e => setCustomCarrier(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
              />
            )}
            <input
              type="text"
              placeholder="Note (optional)"
              value={statusNote}
              onChange={e => setStatusNote(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsShipOpen(false)} className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500">
                Cancel
              </button>
              <button
                onClick={handleShip}
                disabled={isUpdating || !trackingNumber.trim() || (carrier === 'Other' && !customCarrier.trim())}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50 flex items-center gap-1.5"
              >
                {isUpdating && <Loader2 size={13} className="animate-spin" />}
                Mark as Shipped
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel dialog */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-xs font-sans">
            <h3 className="font-serif text-xl text-stone-900">Cancel {order.orderNumber}?</h3>
            <p className="text-stone-500">Reserved stock is released back to inventory.</p>
            <div className="space-y-2">
              {CANCEL_REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="admin-cancel-reason" checked={cancelReason === r} onChange={() => setCancelReason(r)} className="accent-stone-900" />
                  <span className="text-stone-800">{r}</span>
                </label>
              ))}
            </div>
            <textarea
              rows={2}
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              placeholder={cancelReason === 'Other' ? 'Reason (required)' : 'Internal note (optional)'}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsCancelOpen(false)} className="px-4 py-2 border border-stone-200 rounded-xl text-stone-500">
                Keep Order
              </button>
              <button
                onClick={handleCancel}
                disabled={isUpdating || (cancelReason === 'Other' && !cancelNote.trim())}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {isUpdating ? 'Cancelling…' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
