import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Truck, 
  Printer, 
  User, 
  Phone, 
  Mail 
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import type { OrderStatus } from '../../types';

export const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { orders, updateOrderStatus, generateDelhiveryAWB, cancelOrder } = useAdmin();

  const order = orders.find(o => o.id === id || o.orderNumber === id);

  const [adminNote, setAdminNote] = useState('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const cancelReason = 'Customer requested cancellation before dispatch';

  if (!order) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="font-serif text-2xl text-stone-900">Order Not Found</h2>
        <Link to="/admin/orders" className="text-xs font-sans text-allura-goldDark underline">
          Return to Orders
        </Link>
      </div>
    );
  }

  const handleStatusChange = (newStatus: OrderStatus) => {
    updateOrderStatus(order.id, newStatus, adminNote || undefined);
    setAdminNote('');
  };

  const handleGenerateAWB = () => {
    generateDelhiveryAWB(order.id);
  };

  const handleConfirmCancel = () => {
    cancelOrder(order.id, cancelReason);
  };

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
            <StatusBadge status={order.orderStatus} />
          </div>
          <p className="text-xs font-sans text-stone-500 mt-1">
            Placed on {order.date} • Customer: <strong>{order.customer.name}</strong> ({order.customer.phone})
          </p>
        </div>

        {/* Action Controls based on Status */}
        <div className="flex flex-wrap items-center gap-2">
          {order.orderStatus === 'Pending' && (
            <button
              onClick={() => handleStatusChange('Processing')}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider shadow-sm"
            >
              Confirm Order
            </button>
          )}

          {order.orderStatus === 'Processing' && (
            <button
              onClick={() => handleStatusChange('Packed')}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider shadow-sm"
            >
              Mark Packed in Box
            </button>
          )}

          {order.orderStatus === 'Packed' && (
            <button
              onClick={handleGenerateAWB}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
            >
              <Truck size={14} />
              <span>Generate Delhivery AWB & Ship</span>
            </button>
          )}

          {order.orderStatus === 'Shipped' && (
            <button
              onClick={() => handleStatusChange('Delivered')}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider shadow-sm"
            >
              Mark as Delivered
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-sans font-semibold flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Packing Slip</span>
          </button>

          {order.orderStatus !== 'Cancelled' && order.orderStatus !== 'Delivered' && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="px-3.5 py-2 border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-sans font-semibold"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Garment items, Courier Logistics, Activity Log */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Order items table */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-serif text-xl font-normal text-stone-900">Garments in Order ({order.items.length})</h3>
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
                      SKU: <strong>{item.sku}</strong> • Size: {item.selectedSize} • Color: {item.selectedColor.name}
                    </p>
                    <p className="font-bold text-stone-900">
                      ₹ {item.unitPrice.toLocaleString('en-IN')} × {item.quantity} = ₹ {(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delhivery Courier Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
                <Truck size={18} className="text-allura-goldDark" />
                <span>Delhivery Luxury Logistics</span>
              </h3>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                API Integrated
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400">Waybill (AWB)</span>
                <p className="font-mono text-sm font-bold text-stone-900 mt-0.5">
                  {order.tracking?.awb || 'Not Generated Yet'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400">Courier Partner</span>
                <p className="font-medium text-stone-800 mt-0.5">{order.tracking?.courier || 'Delhivery Express'}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-stone-400">Estimated Delivery</span>
                <p className="font-medium text-stone-800 mt-0.5">{order.tracking?.estimatedDelivery || 'Pending Dispatch'}</p>
              </div>
            </div>

            {!order.tracking?.awb && (
              <button
                onClick={handleGenerateAWB}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold uppercase tracking-wider transition-colors"
              >
                Generate Waybill & Print Delhivery Thermal Label
              </button>
            )}
          </div>

          {/* Activity Log */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900">Order Audit History</h3>
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
                <p className="text-stone-400">Initial order placement recorded.</p>
              )}
            </div>

            {/* Add note field */}
            <div className="pt-2 flex gap-2">
              <input
                type="text"
                placeholder="Add internal atelier note..."
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-sans"
              />
              <button
                onClick={() => {
                  if (adminNote) handleStatusChange(order.orderStatus);
                }}
                className="px-4 py-2.5 bg-stone-900 text-white rounded-xl font-bold uppercase text-xs"
              >
                Add Note
              </button>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Customer Details & Financial Breakdown */}
        <div className="space-y-6">
          
          {/* Customer CRM info */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
              <User size={16} className="text-allura-goldDark" />
              <span>Customer Profile</span>
            </h3>
            <div className="space-y-2 text-stone-600 leading-relaxed">
              <p className="font-bold text-stone-900 text-sm">{order.customer.name}</p>
              <p className="flex items-center gap-2">
                <Phone size={13} className="text-stone-400" />
                <span>{order.customer.phone}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail size={13} className="text-stone-400" />
                <span>{order.customer.email}</span>
              </p>
            </div>

            <div className="pt-3 border-t border-stone-100 space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Delivery Address</span>
              <p className="text-stone-800 leading-relaxed pt-1">
                {order.shippingAddress.addressLine1}<br />
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
                  <span>Coupon Discount ({order.couponCode}):</span>
                  <span>-₹ {order.discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>Shipping:</span>
                <span>{order.shippingFee === 0 ? 'Complimentary' : `₹ ${order.shippingFee}`}</span>
              </div>
              <div className="flex justify-between text-stone-400 text-[11px]">
                <span>Integrated GST:</span>
                <span>₹ {order.tax.toLocaleString('en-IN')} (Included)</span>
              </div>
              <div className="flex justify-between text-base font-serif font-bold text-stone-900 pt-2 border-t border-stone-200">
                <span>Total Amount:</span>
                <span className="text-allura-goldDark">₹ {order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl flex items-center justify-between border border-stone-200 text-[11px]">
              <span>Payment Gateway:</span>
              <strong className="text-stone-800 font-mono">Razorpay ({order.paymentMethod})</strong>
            </div>
          </div>

        </div>

      </div>

      {/* Cancellation confirmation modal */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancel Order"
        message={`Are you sure you want to cancel order ${order.orderNumber}? This will release the allocated inventory back into the available stock pool.`}
        confirmLabel="Confirm Cancellation"
        isDestructive
      />
    </div>
  );
};
