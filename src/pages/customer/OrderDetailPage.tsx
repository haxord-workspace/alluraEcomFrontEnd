import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  FileText,
  RotateCcw,
  MessageCircle,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Lock,
  Copy,
  Check
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { InvoiceModal } from '../../components/common/InvoiceModal';
import { Modal } from '../../components/common/Modal';
import { AddressSlipButton } from '../../components/common/AddressSlipButton';
import { canDownloadInvoice } from '../../utils/addressSlipEligibility';
import { ItemVariantMeta } from '../../components/common/ItemVariantMeta';
import { OrderDetailSkeleton } from '../../components/ui/OrderDetailSkeleton';
import { useCustomerOrder } from '../../hooks/useCustomerOrder';
import { useOrderPayment } from '../../hooks/useOrderPayment';
import { OrderItemReviewAction } from '../../components/reviews/OrderItemReviewAction';
import { shouldShowOrderTracking } from '../../utils/reviewEligibility';
import { useExchangeEligibility } from '../../hooks/useExchangeEligibility';
import {
  getUserFacingCancelReason,
  formatUserFacingStatus,
  formatUserFacingPaymentStatus,
  toReadableText,
} from '../../utils/userFacingText';

// const CANCELLABLE = ['Pending', 'Confirmed', 'Processing'];
const CANCEL_REASONS = [
  'Ordered by mistake',
  'Found a better price',
  'Delivery is taking too long',
  'Want to change size / colour',
  'Other',
];

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { formatPrice, formatExactPrice, invoiceOrder, setInvoiceOrder, cancelCustomerOrder, customer, loadOrder, showToast } = useShop();
  const { order, isLoading: isLoadingOrder } = useCustomerOrder(orderId);
  const { payForOrder, isPaying } = useOrderPayment();
  // Must run on every render (even while order is still loading) to satisfy the Rules of Hooks
  const exchangeEligibility = useExchangeEligibility(order);

  // Online orders whose payment hasn't gone through yet (closed popup, failed attempt)
  const needsPayment =
    !!order &&
    order.paymentMethod !== 'COD' &&
    ['Pending', 'Failed', 'Authorized'].includes(order.paymentStatus) &&
    !['Cancelled', 'Returned', 'Refunded'].includes(order.orderStatus);

  const handlePayNow = async () => {
    if (!order) return;
    const outcome = await payForOrder(order.id, {
      retry: true,
      purchase: {
        value: order.total,
        currency: 'INR',
        num_items: order.items.reduce((n, i) => n + i.quantity, 0),
        content_ids: order.items.map(i => i.sku || i.product.id),
        content_type: 'product',
      },
      description: `Order ${order.orderNumber}`,
      prefill: {
        name: customer?.name,
        email: customer?.email,
        contact: typeof customer?.phone === 'string' ? customer.phone.replace(/\s+/g, '') : undefined,
      },
    });
    if (outcome.ok === false) {
      showToast(outcome.message, outcome.reason === 'dismissed' ? 'info' : 'error');
    } else {
      showToast('Payment successful. Thank you!', 'success');
    }
    loadOrder(order.id);
  };

  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAwbCopied, setIsAwbCopied] = useState(false);

  const copyAwb = async (awb: string) => {
    try {
      await navigator.clipboard.writeText(awb);
      setIsAwbCopied(true);
      window.setTimeout(() => setIsAwbCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — nothing to fall back to safely, so no-op
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    setIsCancelling(true);
    const reason = cancelReason === 'Other' ? cancelNote.trim() || 'Other' : cancelReason;
    const ok = await cancelCustomerOrder(order.id, reason, cancelReason === 'Other' ? undefined : cancelNote.trim() || undefined);
    setIsCancelling(false);
    if (ok) setIsCancelOpen(false);
  };

  if (isLoadingOrder) {
    return <OrderDetailSkeleton />;
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl text-allura-text">Order Not Found</h2>
        <p className="text-xs font-sans text-allura-muted">The requested order reference could not be found.</p>
        <Link
          to="/account/orders"
          className="inline-block px-5 py-2.5 bg-allura-darkBrown text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const isCancelled = /cancell?ed/i.test(String(order.orderStatus || ''));
  const isShippedOrLater = ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.orderStatus);

  const cancelEntry = order.history
    ? [...order.history].reverse().find(h => String(h.status || h.to || '').toUpperCase() === 'CANCELLED')
    : undefined;

  const orderCancelNote = (order.cancelNote || cancelEntry?.note)?.trim();

  const milestones = isCancelled
    ? [
        { title: 'Order Placed', status: 'Order Placed & Payment Confirmed', done: true, isCancelled: false },
        { title: 'Order Cancelled', status: 'Cancelled', done: true, isCancelled: true },
      ]
    : [
        { title: 'Order Placed', status: 'Order Placed & Payment Confirmed', done: true, isCancelled: false },
        { title: 'Processing', status: 'Processing', done: order.orderStatus !== 'Pending', isCancelled: false },
        { title: 'Packed in Luxury Box', status: 'Packed', done: ['Packed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(order.orderStatus), isCancelled: false },
        { title: 'Dispatched via Courier', status: 'Shipped', done: ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.orderStatus), isCancelled: false },
        { title: 'Delivered', status: 'Delivered', done: order.orderStatus === 'Delivered', isCancelled: false },
      ];

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 print:hidden">
        {/* Top Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-allura-border/60 pb-6">
          <div>
            <Link
              to="/account/orders"
              className="inline-flex items-center gap-1.5 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to All Orders</span>
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">
                {order.orderNumber}
              </h1>
              <StatusBadge status={formatUserFacingStatus(order.orderStatus)} />
            </div>
            <p className="text-xs font-sans text-allura-muted mt-1">
              Placed on {order.date} • Paid via {toReadableText(order.paymentMethod)} ({formatUserFacingPaymentStatus(order.paymentStatus)})
            </p>
            {isCancelled && (
              <div className="mt-3 p-4 bg-rose-50/80 border border-rose-200 text-rose-900 rounded-xl flex items-start gap-2.5">
                <XCircle size={16} className="text-rose-700 shrink-0 mt-0.5" />
                <div className="text-xs font-sans text-rose-800 space-y-1">
                  <p>
                    This order was <strong className="text-rose-900">Cancelled</strong>.{getUserFacingCancelReason(order.cancelReason) ? ` ${getUserFacingCancelReason(order.cancelReason)}.` : ''}
                  </p>
                  {orderCancelNote && (
                    <p className="text-xs text-rose-800/95">
                      <span className="font-semibold text-rose-900">Cancellation Note: </span>
                      {orderCancelNote}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {shouldShowOrderTracking(order) && (
            <Link
              to={`/account/orders/${order.id}/tracking`}
              className="px-4 py-2 bg-allura-gold/15 text-allura-goldDark border border-allura-gold/30 rounded-xl text-xs font-sans font-bold hover:bg-allura-gold/25 transition-colors flex items-center gap-1.5"
            >
              <Truck size={14} />
              <span>Track Live Shipment</span>
            </Link>
            )}

            {(canDownloadInvoice(order) || !!order.invoiceNumber) ? (
              <button
                onClick={() => setInvoiceOrder(order)}
                className="px-4 py-2 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-text hover:bg-allura-bgSecondary transition-colors flex items-center gap-1.5"
              >
                <FileText size={14} />
                <span>Invoice</span>
              </button>
            ) : (
              <button
                disabled
                title="Invoice and address slip will be available once payment is confirmed."
                className="px-4 py-2 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-muted opacity-60 cursor-not-allowed flex items-center gap-1.5"
              >
                <FileText size={14} />
                <span>Invoice</span>
              </button>
            )}

            <AddressSlipButton order={order} variant="detail" />

            {needsPayment && (
              <button
                onClick={handlePayNow}
                disabled={isPaying}
                className="px-4 py-2 bg-allura-darkBrown hover:bg-allura-goldDark text-white rounded-xl text-xs font-sans font-bold transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                <Lock size={14} />
                <span>{isPaying ? 'Opening payment…' : `Pay Now · ${formatExactPrice(order.total)}`}</span>
              </button>
            )}

            {/* {CANCELLABLE.includes(order.orderStatus) && (
            <button
              onClick={() => setIsCancelOpen(true)}
              className="px-4 py-2 border border-rose-200 bg-rose-50 text-rose-700 rounded-xl text-xs font-sans font-bold hover:bg-rose-100 transition-colors flex items-center gap-1.5"
            >
              <XCircle size={14} />
              <span>Cancel Order</span>
            </button>
          )} */}

            {/* Eligible orders get a per-product button in the items list below. When the order is
                Delivered but the window has closed (or the delivery date is unknown), show the expiry
                message instead of a disabled button. */}
            {exchangeEligibility && !exchangeEligibility.eligible && order.orderStatus === 'Delivered' && (
                <p className="max-w-xs text-[11px] font-sans text-allura-muted">
                  {exchangeEligibility.reason}
                </p>
            )}
          </div>
        </div>

        {/* Visual Stepper / Progress */}
        <div className={`bg-allura-card rounded-2xl p-6 shadow-subtle space-y-4 ${
          isCancelled ? 'border border-rose-300 ring-1 ring-rose-200/50' : 'border border-allura-border'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-sans font-bold tracking-[0.2em] uppercase ${
              isCancelled ? 'text-rose-700' : 'text-allura-goldDark'
            }`}>
              ORDER PROGRESS
            </span>
            {isCancelled && (
              <span className="text-[11px] font-sans font-semibold text-rose-700 bg-rose-100/70 px-2.5 py-0.5 rounded-full border border-rose-200">
                Cancelled
              </span>
            )}
          </div>
          <div className={`grid gap-3 pt-2 ${isCancelled ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2 sm:grid-cols-5'}`}>
            {milestones.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-left transition-all ${
                  m.isCancelled
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                    : m.done
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : 'bg-allura-bg/40 border-allura-border/60 text-allura-muted'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {m.isCancelled ? (
                    <XCircle size={14} className="text-rose-700" />
                  ) : m.done ? (
                    <CheckCircle size={14} className="text-emerald-700" />
                  ) : (
                    <Clock size={14} />
                  )}
                  <span className={`text-[10px] font-sans font-bold uppercase tracking-wider ${
                    m.isCancelled ? 'text-rose-700' : ''
                  }`}>
                    {m.isCancelled ? 'Status' : `Step 0${idx + 1}`}
                  </span>
                </div>
                <p className={`text-xs font-serif font-medium ${m.isCancelled ? 'text-rose-900 font-bold' : ''}`}>{m.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main Grid: Items & Order Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left 2 Cols: Items & Shipment Details */}
          <div className="lg:col-span-2 space-y-6">

            {/* Items card */}
            <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4">
              <h3 className="font-serif text-lg text-allura-text font-normal">Ordered Garments ({order.items.length})</h3>
              <div className="divide-y divide-allura-border/60">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                    <img
                      src={item.product.images.primary}
                      alt={item.product.name}
                      className="w-20 h-24 object-cover rounded-xl bg-allura-bgSecondary flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-serif text-base font-normal text-allura-text">
                        {item.product.name}
                      </h4>
                      <ItemVariantMeta size={item.selectedSize} color={item.selectedColor} sku={item.sku} />
                      <p className="text-xs text-allura-muted font-sans">
                        Qty: <strong>{item.quantity}</strong>
                      </p>
                      <p className="text-sm font-sans font-bold text-allura-darkBrown pt-1">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                      <OrderItemReviewAction order={order} item={item} />
                      {exchangeEligibility?.eligible && (
                        <Link
                          to={`/account/orders/${order.id}/return?item=${idx}`}
                          className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-800 rounded-lg text-[11px] font-sans font-bold hover:bg-amber-100 transition-colors"
                        >
                          <RotateCcw size={13} />
                          <span>Exchange Request</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Courier & AWB Card — only once there's an actual shipment to show */}
            {!isCancelled && isShippedOrLater && (
              <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-serif text-lg text-allura-text font-normal flex items-center gap-2">
                    <Truck size={18} className="text-allura-goldDark shrink-0" />
                    <span>Courier & Logistics Details</span>
                  </h3>
                  {order.tracking?.courier && (
                    <span className="text-xs font-sans text-allura-goldDark font-bold uppercase tracking-wider text-right break-words">
                      {order.tracking.courier}
                    </span>
                  )}
                </div>

                {order.tracking?.awb ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans text-allura-muted pt-2">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold tracking-wider text-allura-muted/70">Waybill (AWB)</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="font-mono text-sm font-bold text-allura-text break-all">
                            {order.tracking.awb}
                          </p>
                          <button
                            type="button"
                            onClick={() => copyAwb(order.tracking!.awb)}
                            className="shrink-0 p-1 rounded-lg text-allura-muted hover:text-allura-goldDark hover:bg-allura-bgSecondary transition-colors"
                            aria-label="Copy AWB number"
                            title="Copy AWB number"
                          >
                            {isAwbCopied ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold tracking-wider text-allura-muted/70">Estimated Arrival</p>
                        <p className="text-sm font-medium text-allura-text mt-0.5">
                          {order.tracking?.estimatedDelivery || 'Shared once dispatched'}
                        </p>
                      </div>
                    </div>

                    {order.tracking.trackingUrl && (
                      <a
                        href={order.tracking.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-sans font-bold text-allura-goldDark hover:underline"
                      >
                        <Truck size={13} />
                        <span>Track shipment</span>
                      </a>
                    )}

                    <p className={`text-xs font-sans p-3 rounded-xl border ${
                      isCancelled
                        ? 'text-rose-800 bg-rose-50/80 border-rose-200'
                        : 'text-emerald-800 bg-emerald-50/70 border-emerald-200'
                    }`}>
                      Current Status: <strong>{toReadableText(order.tracking.currentStatus || order.orderStatus)}</strong>
                    </p>
                  </>
                ) : (
                  <p className="text-xs font-sans text-allura-muted p-3 rounded-xl border border-allura-border bg-allura-bgSecondary/50">
                    Tracking details will be updated soon.
                  </p>
                )}
              </div>
            )}

          </div>

          {/* Right Col: Price Breakdown & Delivery Address */}
          <div className="space-y-6">

            {/* Price Breakdown */}
            <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4">
              <h3 className="font-serif text-lg text-allura-text font-normal">Payment Summary</h3>
              <div className="space-y-2.5 text-xs font-sans">
                <div className="flex justify-between text-allura-muted">
                  <span>Items Subtotal:</span>
                  <span className="text-allura-text font-medium">{formatExactPrice(order.subtotal)}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Coupon Discount ({order.couponCode}):</span>
                    <span>-{formatExactPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-allura-muted">
                  <span>Luxury Shipping:</span>
                  <span className="text-allura-text font-medium">
                    {order.shippingFee === 0 ? 'Complimentary' : formatExactPrice(order.shippingFee)}
                  </span>
                </div>
                <div className="flex justify-between text-allura-muted text-[11px]">
                  <span>Taxes & GST (5%):</span>
                  <span>Included in price</span>
                </div>
                <div className="flex justify-between text-base font-serif font-bold text-allura-text pt-3 border-t border-allura-border">
                  <span>Total Paid:</span>
                  <span className="text-allura-goldDark">{formatExactPrice(order.total)}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-sans text-allura-muted flex items-center gap-1.5 bg-allura-bg p-2.5 rounded-xl border border-allura-border">
                  <CreditCard size={14} className="text-allura-gold" />
                  <span>Authorized via Razorpay ({toReadableText(order.paymentMethod)})</span>
                </span>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-3">
              <h3 className="font-serif text-lg text-allura-text font-normal flex items-center gap-2">
                <MapPin size={16} className="text-allura-goldDark" />
                <span>Delivery Address</span>
              </h3>
              <div className="text-xs font-sans text-allura-muted leading-relaxed">
                <p className="font-bold text-allura-text">{order.shippingAddress.fullName}</p>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>
                  {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}
                </p>
                <p>{order.shippingAddress.country}</p>
                <p className="pt-1">Phone: <strong className="text-allura-text">{order.shippingAddress.phone.countryCode} {order.shippingAddress.phone.number}</strong></p>
              </div>
            </div>

            {/* Stylist Concierge CTA */}
            <a
              href={`https://wa.me/919037991774?text=Hello%20Allura%20Stylist%2C%20I%20have%20an%20inquiry%20regarding%20order%20${order.orderNumber}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366]/10 text-[#128C7E] border border-[#25D366]/30 p-4 rounded-2xl text-xs font-sans font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#25D366]/20 transition-colors"
            >
              <MessageCircle size={16} />
              <span>Chat with Order Stylist</span>
            </a>

          </div>

        </div>
      </div>

      <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />

      {/* Cancel order dialog */}
      <Modal
        open={isCancelOpen}
        onClose={() => setIsCancelOpen(false)}
        isBusy={isCancelling}
        isDirty={false}
        backdropClassName="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm"
        panelClassName="relative bg-allura-card border border-allura-border rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl focus:outline-none"
      >
        <div className="overflow-y-auto p-6 space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl text-allura-text pr-8">Cancel order {order.orderNumber}?</h3>
            <p className="text-allura-muted">Tell us why you're cancelling. Any payment made will be refunded to the original method.</p>
            <div className="space-y-2">
              {CANCEL_REASONS.map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="cancel-reason" checked={cancelReason === r} onChange={() => setCancelReason(r)} className="accent-allura-goldDark" />
                  <span className="text-allura-text">{r}</span>
                </label>
              ))}
            </div>
            <textarea
              rows={2}
              value={cancelNote}
              onChange={e => setCancelNote(e.target.value)}
              placeholder={cancelReason === 'Other' ? 'Please tell us the reason' : 'Anything else? (optional)'}
              className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl resize-none focus:outline-none focus:border-allura-gold"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsCancelOpen(false)} className="px-4 py-2 border border-allura-border rounded-xl text-allura-muted">
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling || (cancelReason === 'Other' && !cancelNote.trim())}
                className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold uppercase tracking-wider disabled:opacity-50"
              >
                {isCancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            </div>
        </div>
      </Modal>
    </>
  );
};
