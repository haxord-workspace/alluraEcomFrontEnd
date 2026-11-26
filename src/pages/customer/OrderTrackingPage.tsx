import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle, Truck, ShieldCheck, MessageCircle, X, XCircle, Copy, Check, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useCustomerOrder } from '../../hooks/useCustomerOrder';
import { OrderTrackingSkeleton } from '../../components/ui/OrderTrackingSkeleton';
import { formatUserFacingStatus, toReadableText } from '../../utils/userFacingText';

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { order, isLoading: isLoadingOrder } = useCustomerOrder(orderId);
  const [isAwbCopied, setIsAwbCopied] = useState(false);

  const copyAwb = async (awb: string) => {
    try {
      await navigator.clipboard.writeText(awb);
      setIsAwbCopied(true);
      window.setTimeout(() => setIsAwbCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — no safe fallback, so no-op
    }
  };

  if (isLoadingOrder) {
    return <OrderTrackingSkeleton />;
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl text-allura-text">Tracking Information Unavailable</h2>
        <p className="text-xs font-sans text-allura-muted">Could not find shipment tracking for this reference.</p>
        <Link
          to="/account/orders"
          className="inline-block px-5 py-2.5 bg-allura-darkBrown text-white rounded-xl text-xs font-sans font-bold"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  const isCancelled = /cancell?ed/i.test(String(order.orderStatus || ''));
  const hasRealAwb = !!order.tracking?.awb;

  // Before dispatch there is no courier data yet: show the real state instead of a sample shipment
  const tracking = {
    awb: order.tracking?.awb || (isCancelled ? 'Cancelled' : 'Assigned at dispatch'),
    courier: order.tracking?.courier || (isCancelled ? 'N/A' : 'To be assigned'),
    courierService: order.tracking?.courierService || '',
    estimatedDelivery: isCancelled ? 'Cancelled' : (order.tracking?.estimatedDelivery || 'Shared once dispatched'),
    currentStatus: isCancelled ? 'Cancelled' : (order.tracking?.currentStatus || order.orderStatus),
    trackingUrl: order.tracking?.trackingUrl,
  };

  const baseMilestones =
    order.tracking?.milestones && order.tracking.milestones.length > 0
      ? order.tracking.milestones
      : [
          {
            status: 'Order Placed',
            location: '',
            timestamp: order.date,
            description: 'We have received your order and will prepare it for dispatch.',
            completed: true,
            current: !isCancelled,
          },
        ];

  const milestones = isCancelled
    ? baseMilestones.some(m => /cancell?ed/i.test(m.status))
      ? baseMilestones
      : [
          ...baseMilestones.map(m => ({ ...m, current: false })),
          {
            status: 'Order Cancelled',
            location: '',
            timestamp: order.date,
            description: 'This order was cancelled and will not be shipped.',
            completed: false,
            current: true,
          },
        ]
    : baseMilestones;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Top Breadcrumb */}
      <div>
        <Link
          to={`/account/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors mb-2"
        >
          <ArrowLeft size={14} />
          <span>Back to Order #{order.orderNumber}</span>
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal">
              Track Shipment
            </h1>
            <p className="text-xs font-sans text-allura-muted mt-1">
              {isCancelled ? (
                <span className="text-rose-700 font-semibold">Order was cancelled</span>
              ) : (
                <>Live updates via <strong>{toReadableText(tracking.courier)}</strong> (Air Express)</>
              )}
            </p>
          </div>
          <StatusBadge status={formatUserFacingStatus(order.orderStatus)} />
        </div>
      </div>

      {/* Overview Tracking Card */}
      <div className={`bg-allura-card rounded-2xl p-6 sm:p-8 shadow-luxury space-y-6 ${
        isCancelled ? 'border border-rose-300 ring-1 ring-rose-200/50' : 'border border-allura-border'
      }`}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-allura-border/60">
          <div className="min-w-0">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">
              WAYBILL / AWB NUMBER
            </span>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-mono text-base font-bold text-allura-darkBrown break-all">
                {tracking.awb}
              </p>
              {hasRealAwb && (
                <button
                  type="button"
                  onClick={() => copyAwb(order.tracking!.awb)}
                  className="shrink-0 p-1 rounded-lg text-allura-muted hover:text-allura-goldDark hover:bg-allura-bgSecondary transition-colors"
                  aria-label="Copy AWB number"
                  title="Copy AWB number"
                >
                  {isAwbCopied ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                </button>
              )}
            </div>
            {tracking.trackingUrl && (
              <a
                href={tracking.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-1 text-[11px] font-sans font-bold text-allura-goldDark hover:underline"
              >
                <span>Track shipment</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>

          <div>
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">
              {isCancelled ? 'SHIPMENT STATUS' : 'ESTIMATED DELIVERY'}
            </span>
            <p className={`font-serif text-base font-bold mt-1 ${isCancelled ? 'text-rose-700' : 'text-emerald-800'}`}>
              {isCancelled ? 'Cancelled' : toReadableText(tracking.estimatedDelivery)}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">
              DESTINATION
            </span>
            <p className="text-xs font-sans font-semibold text-allura-text mt-1">
              {order.shippingAddress.city}, {order.shippingAddress.state} ({order.shippingAddress.postalCode})
            </p>
          </div>
        </div>

        {/* Current status banner */}
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          isCancelled
            ? 'bg-rose-50/80 border-rose-200 text-rose-900'
            : 'bg-allura-bgSecondary/70 border-allura-border/80'
        }`}>
          {isCancelled ? (
            <XCircle size={20} className="text-rose-600 flex-shrink-0" />
          ) : (
            <Truck size={20} className="text-allura-gold flex-shrink-0 animate-pulse-subtle" />
          )}
          <div className="text-xs font-sans">
            <span className={isCancelled ? 'text-rose-800' : 'text-allura-muted'}>
              Current Shipment Status:{' '}
            </span>
            <strong className={isCancelled ? 'text-rose-900 font-bold' : 'text-allura-text'}>
              {isCancelled ? 'Cancelled' : toReadableText(tracking.currentStatus)}
            </strong>
          </div>
        </div>

        {/* Vertical/Horizontal Timeline */}
        <div className="space-y-6 pt-4">
          <h3 className="font-serif text-lg text-allura-text font-normal">Tracking Milestones & History</h3>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-allura-border">
            {milestones.map((milestone, idx) => {
              const isStepCancelled = /cancell?ed/i.test(milestone.status) || (isCancelled && milestone.current);
              return (
                <div key={idx} className="relative space-y-1">
                  {/* Milestone Node */}
                  <div
                    className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isStepCancelled
                        ? 'bg-rose-600 border-rose-600 text-white'
                        : milestone.completed
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : milestone.current
                        ? 'bg-amber-500 border-amber-500 text-white animate-pulse'
                        : 'bg-allura-card border-allura-border text-allura-muted'
                    }`}
                  >
                    {isStepCancelled ? (
                      <X size={12} strokeWidth={2.5} />
                    ) : milestone.completed ? (
                      <CheckCircle size={12} />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className={`font-serif text-base ${isStepCancelled ? 'font-semibold text-rose-700' : 'font-medium text-allura-text'}`}>
                      {toReadableText(milestone.status)}
                    </h4>
                    <span className="text-[11px] font-sans text-allura-muted">
                      {milestone.timestamp}
                    </span>
                  </div>

                  {milestone.location ? (
                    <p className="text-xs font-sans text-allura-goldDark font-semibold flex items-center gap-1">
                      <MapPin size={12} />
                      <span>{milestone.location}</span>
                    </p>
                  ) : null}

                  <p className={`text-xs font-sans ${isStepCancelled ? 'text-rose-800/90' : 'text-allura-muted'}`}>
                    {milestone.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Concierge & Security Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-allura-card border border-allura-border rounded-xl p-4 flex items-center gap-3 shadow-subtle">
          <ShieldCheck size={24} className="text-emerald-700 flex-shrink-0" />
          <div className="text-xs font-sans">
            <p className="font-bold text-allura-text">Tamper-Proof Boutique Seal</p>
            <p className="text-allura-muted">Please ensure security seal is intact upon delivery verification.</p>
          </div>
        </div>

        <a
          href={`https://wa.me/919037991774?text=Hello%20Allura%20Stylist%2C%20I%20need%20urgent%20logistics%20support%20for%20order%20${order.orderNumber}.`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366]/10 text-[#128C7E] border border-[#25D366]/30 rounded-xl p-4 flex items-center justify-center gap-2 text-xs font-sans font-bold uppercase tracking-wider hover:bg-[#25D366]/20 transition-colors"
        >
          <MessageCircle size={16} />
          <span>Support for Courier Delays</span>
        </a>
      </div>
    </div>
  );
};
