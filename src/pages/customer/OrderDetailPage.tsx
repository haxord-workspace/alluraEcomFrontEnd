import React from 'react';
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
  Truck
} from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { InvoiceModal } from '../../components/common/InvoiceModal';

export const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { getOrderById, formatPrice, invoiceOrder, setInvoiceOrder } = useShop();

  const order = orderId ? getOrderById(orderId) : undefined;

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

  const milestones = [
    { title: 'Order Placed', status: 'Order Placed & Payment Confirmed', done: true },
    { title: 'Processing', status: 'Processing', done: order.orderStatus !== 'Pending' },
    { title: 'Packed in Luxury Box', status: 'Packed', done: ['Packed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(order.orderStatus) },
    { title: 'Dispatched via Courier', status: 'Shipped', done: ['Shipped', 'Out for Delivery', 'Delivered'].includes(order.orderStatus) },
    { title: 'Delivered', status: 'Delivered', done: order.orderStatus === 'Delivered' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
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
            <StatusBadge status={order.orderStatus} />
          </div>
          <p className="text-xs font-sans text-allura-muted mt-1">
            Placed on {order.date} • Paid via {order.paymentMethod} ({order.paymentStatus})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/account/orders/${order.id}/tracking`}
            className="px-4 py-2 bg-allura-gold/15 text-allura-goldDark border border-allura-gold/30 rounded-xl text-xs font-sans font-bold hover:bg-allura-gold/25 transition-colors flex items-center gap-1.5"
          >
            <Truck size={14} />
            <span>Track Live Shipment</span>
          </Link>

          <button
            onClick={() => setInvoiceOrder(order)}
            className="px-4 py-2 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-text hover:bg-allura-bgSecondary transition-colors flex items-center gap-1.5"
          >
            <FileText size={14} />
            <span>Tax Invoice</span>
          </button>

          {order.orderStatus === 'Delivered' && (
            <Link
              to={`/account/orders/${order.id}/return`}
              className="px-4 py-2 border border-amber-300 bg-amber-50 text-amber-800 rounded-xl text-xs font-sans font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={14} />
              <span>Request Return / Exchange</span>
            </Link>
          )}
        </div>
      </div>

      {/* Visual Stepper / Progress */}
      <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4">
        <span className="text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-allura-goldDark">
          ORDER PROGRESS
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {milestones.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-left transition-all ${
                m.done
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                  : 'bg-allura-bg/40 border-allura-border/60 text-allura-muted'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {m.done ? <CheckCircle size={14} className="text-emerald-700" /> : <Clock size={14} />}
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider">
                  Step 0{idx + 1}
                </span>
              </div>
              <p className="text-xs font-serif font-medium">{m.title}</p>
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
                    <p className="text-xs text-allura-muted font-sans">
                      Size: <strong className="text-allura-text">{item.selectedSize}</strong> • Color: {item.selectedColor.name} • SKU: {item.sku}
                    </p>
                    <p className="text-xs text-allura-muted font-sans">
                      Qty: <strong>{item.quantity}</strong>
                    </p>
                    <p className="text-sm font-sans font-bold text-allura-darkBrown pt-1">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Courier & AWB Card */}
          <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg text-allura-text font-normal flex items-center gap-2">
                <Truck size={18} className="text-allura-goldDark" />
                <span>Courier & Logistics Details</span>
              </h3>
              <span className="text-xs font-sans text-allura-goldDark font-bold uppercase tracking-wider">
                {order.tracking?.courier || 'Delhivery Luxury Express'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans text-allura-muted pt-2">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-allura-muted/70">Waybill (AWB)</p>
                <p className="font-mono text-sm font-bold text-allura-text mt-0.5">
                  {order.tracking?.awb || 'DLHV894719283IN'}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-allura-muted/70">Estimated Arrival</p>
                <p className="text-sm font-medium text-allura-text mt-0.5">
                  {order.tracking?.estimatedDelivery || 'Within 3 Business Days'}
                </p>
              </div>
            </div>

            <p className="text-xs font-sans text-emerald-800 bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
              Current Status: <strong>{order.tracking?.currentStatus || 'Dispatched from Perinthalmanna Atelier'}</strong>
            </p>
          </div>

        </div>

        {/* Right Col: Price Breakdown & Delivery Address */}
        <div className="space-y-6">
          
          {/* Price Breakdown */}
          <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4">
            <h3 className="font-serif text-lg text-allura-text font-normal">Payment Summary</h3>
            <div className="space-y-2.5 text-xs font-sans">
              <div className="flex justify-between text-allura-muted">
                <span>Items Subtotal:</span>
                <span className="text-allura-text font-medium">{formatPrice(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Coupon Discount ({order.couponCode}):</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-allura-muted">
                <span>Luxury Shipping:</span>
                <span className="text-allura-text font-medium">
                  {order.shippingFee === 0 ? 'Complimentary' : formatPrice(order.shippingFee)}
                </span>
              </div>
              <div className="flex justify-between text-allura-muted text-[11px]">
                <span>Taxes & GST (5%):</span>
                <span>Included in price</span>
              </div>
              <div className="flex justify-between text-base font-serif font-bold text-allura-text pt-3 border-t border-allura-border">
                <span>Total Paid:</span>
                <span className="text-allura-goldDark">{formatPrice(order.total)}</span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[11px] font-sans text-allura-muted flex items-center gap-1.5 bg-allura-bg p-2.5 rounded-xl border border-allura-border">
                <CreditCard size={14} className="text-allura-gold" />
                <span>Authorized via Razorpay ({order.paymentMethod})</span>
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
              <p className="font-bold text-allura-text">{order.shippingAddress.name}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.district} - {order.shippingAddress.pincode}
              </p>
              <p>{order.shippingAddress.state}, India</p>
              <p className="pt-1">Phone: <strong className="text-allura-text">{order.shippingAddress.phone}</strong></p>
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

      <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    </div>
  );
};
