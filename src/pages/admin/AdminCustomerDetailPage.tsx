import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Sparkles, MessageCircle, Scissors } from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminCustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { getCustomerById, orders } = useAdmin();

  const customer = id ? getCustomerById(id) : undefined;

  if (!customer) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="font-serif text-2xl text-stone-900">Customer Not Found</h2>
        <Link to="/admin/customers" className="text-xs font-sans text-allura-goldDark underline">
          Return to Customer Database
        </Link>
      </div>
    );
  }

  const customerOrders = orders.filter(
    o => o.customer.email === customer.email || o.customer.phone === customer.phone
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <Link
            to="/admin/customers"
            className="inline-flex items-center gap-1 text-xs font-sans text-stone-500 hover:text-stone-900 mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Customers CRM</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl text-stone-900 font-normal">
              {customer.name}
            </h1>
            {customer.isCircleMember && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-allura-gold/15 text-allura-goldDark text-xs font-bold uppercase">
                <Sparkles size={12} />
                <span>Allura Circle {customer.circleTier || 'Gold'}</span>
              </span>
            )}
          </div>
          <p className="text-xs font-sans text-stone-500 mt-1">
            Patron since {customer.createdDate || '12 Jan 2026'} • Total Lifetime Orders: {customerOrders.length}
          </p>
        </div>

        <a
          href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(customer.name)}%2C%20this%20is%20Allura%20Boutique%20concierge.`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
        >
          <MessageCircle size={15} />
          <span>Chat on WhatsApp</span>
        </a>
      </div>

      {/* Profile & Sizing Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Total Lifetime Spend</span>
          <p className="font-serif text-2xl font-bold text-stone-900">
            ₹ {(customer.totalSpent || 22497).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Preferred Size</span>
          <p className="font-serif text-2xl font-bold text-allura-goldDark">
            {customer.sizePreferences?.preferredSize || 'M'}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Primary Contact</span>
          <p className="text-xs font-medium text-stone-800 truncate">{customer.phone}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">City & District</span>
          <p className="text-xs font-medium text-stone-800">{customer.addresses[0]?.city || 'Perinthalmanna'}</p>
        </div>
      </div>

      {/* Orders History & Saved Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Order History (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
          <h3 className="font-serif text-xl font-normal text-stone-900">
            Order History ({customerOrders.length})
          </h3>
          <div className="divide-y divide-stone-100">
            {customerOrders.map(order => (
              <div key={order.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={order.items[0]?.product.images.primary}
                    alt={order.items[0]?.product.name}
                    className="w-12 h-16 object-cover rounded-lg bg-stone-100 flex-shrink-0"
                  />
                  <div>
                    <p className="font-serif text-base font-medium text-stone-900">{order.orderNumber}</p>
                    <p className="text-stone-500">{order.date} • {order.items.length} items</p>
                    <p className="font-bold text-stone-900">₹ {order.total.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={order.orderStatus} size="sm" />
                  <Link
                    to={`/admin/orders/${order.id}`}
                    className="text-xs font-bold text-allura-goldDark hover:underline"
                  >
                    View Order
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Addresses & Bespoke Size Card (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
              <MapPin size={16} className="text-allura-goldDark" />
              <span>Saved Delivery Addresses</span>
            </h3>
            <div className="space-y-3">
              {customer.addresses.map(addr => (
                <div key={addr.id} className="p-3 bg-stone-50 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-stone-400">{addr.type}</span>
                  <p className="font-bold text-stone-800">{addr.name}</p>
                  <p className="text-stone-600 leading-relaxed">
                    {addr.addressLine1}, {addr.city}, {addr.district} - {addr.pincode}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
              <Scissors size={16} className="text-allura-goldDark" />
              <span>Bespoke Measurement Notes</span>
            </h3>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
              <p>Standard Size: <strong>{customer.sizePreferences?.preferredSize || 'M'}</strong></p>
              {customer.sizePreferences?.bust && <p>Bust: {customer.sizePreferences.bust}</p>}
              {customer.sizePreferences?.waist && <p>Waist: {customer.sizePreferences.waist}</p>}
              {customer.sizePreferences?.height && <p>Height: {customer.sizePreferences.height}</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
