import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, CheckCircle, Truck, ShieldCheck, MessageCircle } from 'lucide-react';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useCustomerOrder } from '../../hooks/useCustomerOrder';

export const OrderTrackingPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { order, isLoading: isLoadingOrder } = useCustomerOrder(orderId);

  if (isLoadingOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center gap-3 text-allura-muted">
        <div className="w-7 h-7 border-2 border-allura-goldDark border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-sans uppercase tracking-widest">Loading order…</p>
      </div>
    );
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

  // Before dispatch there is no courier data yet: show the real state instead of a sample shipment
  const tracking = {
    awb: order.tracking?.awb || 'Assigned at dispatch',
    courier: order.tracking?.courier || 'To be assigned',
    courierService: order.tracking?.courierService || '',
    estimatedDelivery: order.tracking?.estimatedDelivery || 'Shared once dispatched',
    currentStatus: order.tracking?.currentStatus || order.orderStatus,
    trackingUrl: order.tracking?.trackingUrl,
    milestones:
      order.tracking?.milestones && order.tracking.milestones.length > 0
        ? order.tracking.milestones
        : [
            {
              status: 'Order Placed',
              location: '',
              timestamp: order.date,
              description: 'We have received your order and will prepare it for dispatch.',
              completed: true,
              current: true,
            },
          ],
  };

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
              Live updates via <strong>{tracking.courier}</strong> (Air Express)
            </p>
          </div>
          <StatusBadge status={order.orderStatus} />
        </div>
      </div>

      {/* Overview Tracking Card */}
      <div className="bg-allura-card border border-allura-border rounded-2xl p-6 sm:p-8 shadow-luxury space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-allura-border/60">
          <div>
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">
              WAYBILL / AWB NUMBER
            </span>
            <p className="font-mono text-base font-bold text-allura-darkBrown mt-1">
              {tracking.awb}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">
              ESTIMATED DELIVERY
            </span>
            <p className="font-serif text-base font-bold text-emerald-800 mt-1">
              {tracking.estimatedDelivery}
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
        <div className="bg-allura-bgSecondary/70 p-4 rounded-xl border border-allura-border/80 flex items-center gap-3">
          <Truck size={20} className="text-allura-gold flex-shrink-0 animate-pulse-subtle" />
          <div className="text-xs font-sans">
            <span className="text-allura-muted">Current Shipment Status: </span>
            <strong className="text-allura-text">{tracking.currentStatus}</strong>
          </div>
        </div>

        {/* Vertical/Horizontal Timeline */}
        <div className="space-y-6 pt-4">
          <h3 className="font-serif text-lg text-allura-text font-normal">Tracking Milestones & History</h3>

          <div className="relative pl-6 sm:pl-8 space-y-8 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-allura-border">
            {tracking.milestones.map((milestone, idx) => (
              <div key={idx} className="relative space-y-1">
                {/* Milestone Node */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    milestone.completed
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : milestone.current
                      ? 'bg-amber-500 border-amber-500 text-white animate-pulse'
                      : 'bg-allura-card border-allura-border text-allura-muted'
                  }`}
                >
                  {milestone.completed ? <CheckCircle size={12} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="font-serif text-base font-medium text-allura-text">
                    {milestone.status}
                  </h4>
                  <span className="text-[11px] font-sans text-allura-muted">
                    {milestone.timestamp}
                  </span>
                </div>

                <p className="text-xs font-sans text-allura-goldDark font-semibold flex items-center gap-1">
                  <MapPin size={12} />
                  <span>{milestone.location}</span>
                </p>

                <p className="text-xs font-sans text-allura-muted">
                  {milestone.description}
                </p>
              </div>
            ))}
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
