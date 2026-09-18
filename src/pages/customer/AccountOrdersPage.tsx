import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, Search, Eye, RotateCcw, FileText, ArrowLeft, ShoppingBag } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { InvoiceModal } from '../../components/common/InvoiceModal';

export const AccountOrdersPage: React.FC = () => {
  const { orders, formatPrice, invoiceOrder, setInvoiceOrder, addToCart } = useShop();
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const statuses = ['All', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filterStatus === 'All' || order.orderStatus === filterStatus;
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some(item => item.product.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-allura-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-sans text-allura-muted mb-1">
            <Link to="/account" className="hover:text-allura-text transition-colors flex items-center gap-1">
              <ArrowLeft size={13} />
              <span>Back to Account</span>
            </Link>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal">
            My Orders
          </h1>
          <p className="text-xs font-sans text-allura-muted mt-1">
            Track, view invoices, or request size exchanges for your boutique garments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-allura-muted" />
            <input
              type="text"
              placeholder="Search by order or product..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-allura-card border border-allura-border rounded-xl text-xs font-sans text-allura-text focus:outline-none focus:border-allura-gold w-56 sm:w-64"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-allura-border/40">
        {statuses.map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap ${
              filterStatus === status
                ? 'bg-allura-darkBrown text-white shadow-xs'
                : 'bg-allura-card text-allura-muted hover:text-allura-text border border-allura-border'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-allura-card border border-allura-border rounded-2xl p-12 text-center space-y-4 shadow-subtle">
          <div className="w-14 h-14 rounded-full bg-allura-bgSecondary text-allura-goldDark flex items-center justify-center mx-auto">
            <Package size={28} />
          </div>
          <h3 className="font-serif text-xl text-allura-text">No orders found</h3>
          <p className="text-xs font-sans text-allura-muted max-w-sm mx-auto">
            {searchQuery || filterStatus !== 'All'
              ? 'Try changing your filter selection or search query.'
              : 'You haven’t placed any handcrafted orders yet. Explore our newest atelier arrivals.'}
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold tracking-wider uppercase rounded-xl transition-colors shadow-sm mt-2"
          >
            <ShoppingBag size={14} />
            <span>Start Shopping</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className="bg-allura-card border border-allura-border rounded-2xl p-5 sm:p-6 shadow-subtle space-y-5 hover:border-allura-gold/60 transition-colors"
            >
              {/* Order Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-allura-border/60 text-xs font-sans">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-serif text-base font-bold text-allura-darkBrown">
                    {order.orderNumber}
                  </span>
                  <span className="text-stone-300">•</span>
                  <span className="text-allura-muted">{order.date}</span>
                  <span className="text-stone-300">•</span>
                  <StatusBadge status={order.orderStatus} />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-allura-muted">Total:</span>
                  <span className="font-serif text-base font-bold text-allura-darkBrown">
                    {formatPrice(order.total)}
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                    {order.paymentStatus}
                  </span>
                </div>
              </div>

              {/* Order Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-allura-bg/40 p-3 rounded-xl border border-allura-border/40">
                    <img
                      src={item.product.images.primary}
                      alt={item.product.name}
                      className="w-16 h-20 object-cover rounded-lg bg-allura-bgSecondary flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <h4 className="font-serif text-sm font-normal text-allura-text truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-xs text-allura-muted font-sans">
                        Size: <strong className="text-allura-text">{item.selectedSize}</strong> • Color: {item.selectedColor.name}
                      </p>
                      <p className="text-xs font-sans font-bold text-allura-darkBrown">
                        {formatPrice(item.unitPrice)} {item.quantity > 1 && `× ${item.quantity}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-allura-border/60">
                <div className="text-xs font-sans text-allura-muted flex items-center gap-1.5">
                  <Package size={14} className="text-allura-goldDark" />
                  <span>
                    Courier:{' '}
                    <strong>{order.tracking?.courier || 'Delhivery Luxury Express'}</strong> (AWB:{' '}
                    {order.tracking?.awb || 'Assigned on Dispatch'})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/account/orders/${order.id}`}
                    className="px-3.5 py-1.5 rounded-lg border border-allura-border text-xs font-sans font-semibold text-allura-text hover:bg-allura-bgSecondary transition-colors flex items-center gap-1.5"
                  >
                    <Eye size={13} />
                    <span>View Details</span>
                  </Link>

                  <Link
                    to={`/account/orders/${order.id}/tracking`}
                    className="px-3.5 py-1.5 rounded-lg bg-allura-gold/15 text-allura-goldDark border border-allura-gold/30 text-xs font-sans font-bold hover:bg-allura-gold/25 transition-colors flex items-center gap-1.5"
                  >
                    <Package size={13} />
                    <span>Track Order</span>
                  </Link>

                  <button
                    onClick={() => setInvoiceOrder(order)}
                    className="px-3.5 py-1.5 rounded-lg border border-allura-border text-xs font-sans text-allura-muted hover:text-allura-text hover:bg-allura-bgSecondary transition-colors flex items-center gap-1.5"
                  >
                    <FileText size={13} />
                    <span>Invoice</span>
                  </button>

                  {order.orderStatus === 'Delivered' && (
                    <Link
                      to={`/account/orders/${order.id}/return`}
                      className="px-3.5 py-1.5 rounded-lg border border-allura-border text-xs font-sans text-amber-800 hover:bg-amber-50 transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} />
                      <span>Exchange / Return</span>
                    </Link>
                  )}

                  <button
                    onClick={() => {
                      const firstItem = order.items[0];
                      if (firstItem) {
                        addToCart(firstItem.product, firstItem.selectedSize, firstItem.selectedColor);
                        navigate('/cart');
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-allura-darkBrown text-white text-xs font-sans font-bold hover:bg-allura-softBrown transition-colors"
                  >
                    Buy Again
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Printable Invoice Modal */}
      <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    </div>
  );
};
