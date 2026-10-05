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
  RefreshCw,
  Check,
  CheckCircle2,
  ClipboardCheck,
  PackageOpen,
  Home,
  ShoppingBag,
  XCircle,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Banknote,
  ExternalLink,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useShop } from '../../context/ShopContext';
import { useConfirm } from '../../context/ConfirmContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  getAdminOrder,
  updateAdminOrderStatus,
  cancelAdminOrder,
  toBackendStatus,
  orderErrorMessage,
} from '../../service/orders';
import type { Order, OrderStatus } from '../../types';
import { useAdminOrderCatalog } from '../../hooks/useAdminOrderCatalog';

// Backend order statuses: PENDING | CONFIRMED | PROCESSING | SHIPPED | DELIVERED | CANCELLED | RETURNED.
// Steps can't be skipped (INVALID_ORDER_TRANSITION); cancelling uses its own endpoint.

const STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'Pending', label: 'Placed', icon: ShoppingBag },
  { status: 'Confirmed', label: 'Confirmed', icon: ClipboardCheck },
  { status: 'Processing', label: 'Processing', icon: PackageOpen },
  { status: 'Shipped', label: 'Shipped', icon: Truck },
  { status: 'Delivered', label: 'Delivered', icon: Home },
];

// What the admin should do next, per status
const NEXT_ACTION: Partial<Record<OrderStatus, { to: OrderStatus; label: string; title: string; hint: string }>> = {
  Pending: {
    to: 'Confirmed',
    label: 'Confirm Order',
    title: 'Review and confirm this order',
    hint: 'Check the items and delivery address, then confirm to start fulfilment.',
  },
  Confirmed: {
    to: 'Processing',
    label: 'Start Processing',
    title: 'Prepare the order',
    hint: 'Start stitching, quality checks and packing. Move to Processing when work begins.',
  },
  Processing: {
    to: 'Shipped',
    label: 'Mark as Shipped',
    title: 'Hand over to the courier',
    hint: 'Once the parcel is packed and picked up, add the courier and tracking number.',
  },
  Shipped: {
    to: 'Delivered',
    label: 'Mark as Delivered',
    title: 'Waiting for delivery',
    hint: 'Mark as delivered once the customer has received the parcel.',
  },
};

const CANCEL_REASONS = [
  'Customer requested cancellation',
  'Item out of stock',
  'Payment not received',
  'Suspected fraud',
  'Address not serviceable',
  'Other',
];

const CARRIERS = ['Delhivery', 'Blue Dart', 'DTDC', 'India Post', 'Ekart', 'Shiprocket', 'Other'];

const inr = (n: number) => `₹ ${n.toLocaleString('en-IN')}`;

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAdmin();
  const { showToast } = useShop();
  const confirm = useConfirm();
  const canEdit = hasPermission('orders', 'edit');
  const canCancel = hasPermission('orders', 'cancel');

  const [rawOrder, setOrder] = useState<Order | null>(null);
  const withCatalog = useAdminOrderCatalog();
  const order = React.useMemo(() => (rawOrder ? withCatalog(rawOrder) : null), [rawOrder, withCatalog]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [statusNote, setStatusNote] = useState('');

  // Shipping details (entered inline when moving to Shipped)
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
      showToast(`Order ${order.orderNumber} is now ${to}`, 'success');
      return true;
    } catch (err) {
      showToast(orderErrorMessage(err, 'Could not update the order status'), 'error');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const isPaid = order ? ['Paid', 'Captured'].includes(order.paymentStatus) : false;
  const isCod = order?.paymentMethod === 'COD';

  const handleNextStep = async (to: OrderStatus) => {
    if (!order) return;
    if (to === 'Shipped') {
      const shippingCarrier = carrier === 'Other' ? customCarrier.trim() : carrier;
      const ok = await changeStatus('Shipped', {
        trackingNumber: trackingNumber.trim() || undefined,
        shippingCarrier: shippingCarrier || undefined,
      });
      if (ok) setTrackingNumber('');
      return;
    }
    // Confirming an online order that hasn't been paid deserves a second look
    if (to === 'Confirmed' && !isPaid && !isCod) {
      const ok = await confirm({
        title: 'Payment not received',
        message: `${order.orderNumber} hasn't been paid yet (${order.paymentStatus}). Confirm it anyway?`,
        confirmLabel: 'Confirm anyway',
      });
      if (!ok) return;
    }
    await changeStatus(to);
  };

  const handleMarkReturned = async () => {
    if (!order) return;
    const ok = await confirm({
      title: 'Mark as returned',
      message: `Record that ${order.orderNumber} has been returned by the customer?`,
      confirmLabel: 'Mark returned',
    });
    if (ok) await changeStatus('Returned');
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

  const status = order.orderStatus;
  const isCancelled = status === 'Cancelled';
  const isReturned = status === 'Returned' || status === 'Refunded';
  const isClosed = isCancelled || isReturned || status === 'Delivered';
  const next = NEXT_ACTION[status];
  const currentStepIndex = STEPS.findIndex(s => s.status === status);
  const history = order.activityHistory || [];

  // When each step happened, from the status history ("Status: Processing" …)
  const stepTime = (stepStatus: OrderStatus) =>
    history.find(h => h.action.toLowerCase().endsWith(stepStatus.toLowerCase()))?.timestamp;

  const shipFormValid = !!trackingNumber.trim() && (carrier !== 'Other' || !!customCarrier.trim());
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);

  const paymentBadge = isPaid
    ? { label: 'Paid', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
    : isCod
    ? { label: 'Cash on delivery', className: 'bg-stone-100 text-stone-700 border-stone-200' }
    : { label: `Payment ${order.paymentStatus.toLowerCase()}`, className: 'bg-amber-50 text-amber-800 border-amber-200' };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-sans text-stone-500 hover:text-stone-900 mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to All Orders</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-3xl text-stone-900 font-normal">{order.orderNumber}</h1>
            <StatusBadge status={status} />
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-sans font-medium ${paymentBadge.className}`}>
              {paymentBadge.label}
            </span>
          </div>
          <p className="text-xs font-sans text-stone-500 mt-1">
            Placed {order.date} • {itemCount} item{itemCount === 1 ? '' : 's'} • <strong className="text-stone-700">{inr(order.total)}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchOrder}
            disabled={isLoading}
            className="p-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl disabled:opacity-50"
            title="Refresh"
            aria-label="Refresh"
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
              className="px-3.5 py-2 border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-sans font-semibold flex items-center gap-1.5"
            >
              <XCircle size={14} />
              <span>Cancel Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress tracker */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs">
        {isCancelled || isReturned ? (
          <div className={`flex items-center gap-3 p-4 rounded-xl text-xs font-sans ${isCancelled ? 'bg-rose-50 text-rose-800' : 'bg-orange-50 text-orange-800'}`}>
            {isCancelled ? <XCircle size={20} /> : <RotateCcw size={20} />}
            <div>
              <p className="font-bold text-sm">{isCancelled ? 'This order was cancelled' : 'This order was returned'}</p>
              <p className="opacity-80">No further fulfilment steps. See the history below for details.</p>
            </div>
          </div>
        ) : (
          <ol className="flex items-start">
            {STEPS.map((step, i) => {
              const done = i < currentStepIndex || status === 'Delivered';
              const current = i === currentStepIndex && status !== 'Delivered';
              const Icon = step.icon;
              const time = stepTime(step.status) || (i === 0 ? order.date : undefined);
              return (
                <li key={step.status} className="flex-1 flex flex-col items-center text-center relative">
                  {/* connector */}
                  {i > 0 && (
                    <span
                      className={`absolute top-5 right-1/2 w-full h-0.5 -z-0 ${i <= currentStepIndex || status === 'Delivered' ? 'bg-emerald-600' : 'bg-stone-200'}`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      done
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : current
                        ? 'bg-white border-stone-900 text-stone-900 ring-4 ring-stone-100'
                        : 'bg-white border-stone-200 text-stone-300'
                    }`}
                  >
                    {done ? <Check size={18} /> : <Icon size={17} />}
                  </span>
                  <span className={`mt-2 text-[11px] font-sans font-bold uppercase tracking-wider ${done || current ? 'text-stone-900' : 'text-stone-400'}`}>
                    {step.label}
                  </span>
                  <span className="text-[10px] font-sans text-stone-400 min-h-[14px]">{done || current ? time : ''}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Next step */}
          {canEdit && !isCancelled && !isReturned && (
            <div className={`rounded-2xl p-6 shadow-xs border space-y-4 text-xs font-sans ${next ? 'bg-stone-900 border-stone-900 text-white' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
              {next ? (
                <>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">Next step</span>
                    <h3 className="font-serif text-xl mt-0.5">{next.title}</h3>
                    <p className="text-stone-300 mt-1">{next.hint}</p>
                  </div>

                  {status === 'Pending' && !isPaid && !isCod && (
                    <p className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/15 text-amber-200">
                      <AlertTriangle size={14} className="flex-shrink-0" />
                      Payment hasn't been received for this order yet.
                    </p>
                  )}

                  {next.to === 'Shipped' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Courier</label>
                        <select
                          value={carrier}
                          onChange={e => setCarrier(e.target.value)}
                          className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/60"
                        >
                          {CARRIERS.map(c => <option key={c} value={c} className="text-stone-900">{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-stone-400 mb-1">Tracking / AWB number *</label>
                        <input
                          type="text"
                          value={trackingNumber}
                          onChange={e => setTrackingNumber(e.target.value)}
                          placeholder="e.g. 1234567890"
                          className="w-full p-2.5 bg-white/10 border border-white/20 rounded-xl font-mono text-white placeholder:text-stone-500 focus:outline-none focus:border-white/60"
                        />
                      </div>
                      {carrier === 'Other' && (
                        <input
                          type="text"
                          placeholder="Courier name"
                          value={customCarrier}
                          onChange={e => setCustomCarrier(e.target.value)}
                          className="sm:col-span-2 w-full p-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-white/60"
                        />
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Add a note (optional, shown in the history)"
                      value={statusNote}
                      onChange={e => setStatusNote(e.target.value)}
                      className="flex-1 p-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-stone-500 focus:outline-none focus:border-white/60"
                    />
                    <button
                      onClick={() => handleNextStep(next.to)}
                      disabled={isUpdating || (next.to === 'Shipped' && !shipFormValid)}
                      className="px-5 py-2.5 bg-white text-stone-900 hover:bg-stone-100 rounded-xl font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      {next.label}
                    </button>
                  </div>
                  {next.to === 'Shipped' && !shipFormValid && (
                    <p className="text-[11px] text-amber-200">
                      {carrier === 'Other' && !customCarrier.trim()
                        ? 'Enter the courier name and tracking number to mark this order as shipped.'
                        : 'Enter the tracking / AWB number to mark this order as shipped.'}
                    </p>
                  )}
                </>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={22} className="text-emerald-700" />
                    <div>
                      <p className="font-serif text-lg">Order completed</p>
                      <p className="text-emerald-800/80">Delivered to the customer. No further steps needed.</p>
                    </div>
                  </div>
                  {status === 'Delivered' && (
                    <button
                      onClick={handleMarkReturned}
                      disabled={isUpdating}
                      className="px-3.5 py-2 border border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100 rounded-xl font-semibold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      Mark as Returned
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Order items */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-xl font-normal text-stone-900">Items ({itemCount})</h3>
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
                    <div className="flex flex-wrap gap-1.5">
                      {item.selectedColor?.name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-stone-100 rounded-full text-stone-700">
                          <span className="w-2.5 h-2.5 rounded-full border border-stone-300" style={{ backgroundColor: item.selectedColor.hex }} />
                          {item.selectedColor.name}
                        </span>
                      )}
                      {item.selectedSize && (
                        <span className="px-2 py-0.5 bg-stone-100 rounded-full text-stone-700">Size {item.selectedSize}</span>
                      )}
                      <span className="px-2 py-0.5 bg-stone-100 rounded-full text-stone-500 font-mono">{item.sku || '—'}</span>
                    </div>
                  </div>
                  <div className="text-right text-xs font-sans">
                    <p className="text-stone-500">{inr(item.unitPrice)} × {item.quantity}</p>
                    <p className="font-bold text-stone-900 text-sm">{inr(item.unitPrice * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* History timeline */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900">History</h3>
            {history.length > 0 ? (
              <ol className="relative border-l-2 border-stone-100 ml-2 space-y-5">
                {[...history].reverse().map((act, i) => (
                  <li key={i} className="ml-5">
                    <span
                      className={`absolute -left-[7px] w-3 h-3 rounded-full border-2 border-white ${i === 0 ? 'bg-stone-900' : 'bg-stone-300'}`}
                      aria-hidden="true"
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-semibold text-stone-900">{act.action.replace(/^Status:\s*/, '')}</p>
                      <p className="text-[10px] text-stone-400">{act.timestamp}</p>
                    </div>
                    {act.note && <p className="text-stone-600 mt-0.5">{act.note}</p>}
                    <p className="text-[10px] text-stone-400 mt-0.5">by {act.user}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-stone-400">No status changes yet.</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">

          {/* Customer */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
              <User size={16} className="text-allura-goldDark" />
              <span>Customer</span>
            </h3>
            <div className="space-y-2 text-stone-600">
              <p className="font-bold text-stone-900 text-sm">{order.customer.name}</p>
              {order.customer.phone && (
                <a href={`tel:${order.customer.phone.replace(/\s+/g, '')}`} className="flex items-center gap-2 hover:text-stone-900">
                  <Phone size={13} className="text-stone-400" />
                  <span>{order.customer.phone}</span>
                </a>
              )}
              {order.customer.email && (
                <a href={`mailto:${order.customer.email}`} className="flex items-center gap-2 hover:text-stone-900">
                  <Mail size={13} className="text-stone-400" />
                  <span>{order.customer.email}</span>
                </a>
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

          {/* Shipment */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
              <Truck size={16} className="text-allura-goldDark" />
              <span>Shipment</span>
            </h3>
            {order.tracking?.awb ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-stone-500">Courier</span>
                  <span className="font-semibold text-stone-900">{order.tracking.courier || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">Tracking no.</span>
                  <span className="font-mono font-bold text-stone-900">{order.tracking.awb}</span>
                </div>
                {order.tracking.estimatedDelivery && (
                  <div className="flex justify-between">
                    <span className="text-stone-500">Est. delivery</span>
                    <span className="text-stone-900">{order.tracking.estimatedDelivery}</span>
                  </div>
                )}
                {order.tracking.trackingUrl && (
                  <a
                    href={order.tracking.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-allura-goldDark font-semibold hover:underline"
                  >
                    Track parcel <ExternalLink size={12} />
                  </a>
                )}
              </div>
            ) : (
              <p className="text-stone-400">
                {isCancelled ? 'Not shipped (order cancelled).' : 'Not shipped yet. Tracking details are added when you mark the order as shipped.'}
              </p>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900">Payment</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal</span>
                <span>{inr(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                  <span>-{inr(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Shipping</span>
                <span>{order.shippingFee === 0 ? 'Free' : inr(order.shippingFee)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Tax</span>
                <span>{inr(order.tax)}</span>
              </div>
              <div className="flex justify-between text-base font-serif font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Total</span>
                <span className="text-allura-goldDark">{inr(order.total)}</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl flex items-center justify-between border ${paymentBadge.className}`}>
              <span className="flex items-center gap-2 font-medium">
                {isCod ? <Banknote size={14} /> : <CreditCard size={14} />}
                {isCod ? 'Cash on Delivery' : order.paymentMethod}
              </span>
              <strong>{isPaid ? 'Paid' : order.paymentStatus}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel dialog */}
      {isCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm" onClick={() => setIsCancelOpen(false)}>
          <div
            className="bg-white border border-stone-200 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-xs font-sans"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="font-serif text-xl text-stone-900">Cancel {order.orderNumber}?</h3>
            <p className="text-stone-500">
              Reserved stock is released back to inventory.
              {isPaid && ' The customer has already paid, so remember to arrange a refund.'}
            </p>
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
