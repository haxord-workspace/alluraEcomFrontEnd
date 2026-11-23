import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Sparkles, MessageCircle, Scissors, Loader2, Package } from 'lucide-react';
import { getAdminCustomer, customerErrorMessage } from '../../service/customers';
import { prettyStatus } from '../../service/orders';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { CustomerProfile } from '../../types';
import type { AdminCustomerRecentOrder } from '../../types/customer';

type CustomerDetail = CustomerProfile & { recentOrders: AdminCustomerRecentOrder[] };

const formatOrderDate = (value?: string) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const AdminCustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchCustomer = useCallback(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    setNotFound(false);
    getAdminCustomer(id)
      .then(setCustomer)
      .catch(err => {
        if (err?.response?.status === 404) setNotFound(true);
        else setError(customerErrorMessage(err, 'Could not load this customer'));
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-stone-400">
        <Loader2 size={24} className="animate-spin" />
        <span className="text-xs font-sans">Loading customer…</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="font-serif text-2xl text-stone-900">Customer Not Found</h2>
        <Link to="/admin/customers" className="text-xs font-sans text-allura-goldDark underline">
          Return to Customer Database
        </Link>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="font-serif text-2xl text-stone-900">Could not load this customer</h2>
        <p className="text-xs font-sans text-stone-500">{error}</p>
        <button
          onClick={fetchCustomer}
          className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider"
        >
          Retry
        </button>
      </div>
    );
  }

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
              {customer.name || '—'}
            </h1>
            {customer.isCircleMember && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-allura-gold/15 text-allura-goldDark text-xs font-bold uppercase">
                <Sparkles size={12} />
                <span>Allura Circle {customer.circleTier}</span>
              </span>
            )}
          </div>
          <p className="text-xs font-sans text-stone-500 mt-1">
            Patron since {customer.createdDate || '—'} • Total Lifetime Orders: {customer.ordersCount ?? 0}
            {customer.lastOrderDate ? ` • Last Order: ${customer.lastOrderDate}` : ''}
          </p>
        </div>

        {customer.phone ? (
          <a
            href={`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(customer.name || 'there')}%2C%20this%20is%20Allura%20Boutique%20concierge.`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-2 shadow-sm"
          >
            <MessageCircle size={15} />
            <span>Chat on WhatsApp</span>
          </a>
        ) : (
          <span
            title="No phone number on file"
            className="px-4 py-2 bg-stone-100 text-stone-400 rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-2 cursor-not-allowed"
          >
            <MessageCircle size={15} />
            <span>Chat on WhatsApp</span>
          </span>
        )}
      </div>

      {/* Profile & Sizing Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Total Lifetime Spend</span>
          <p className="font-serif text-2xl font-bold text-[#561C08]">
            {customer.currency === 'USD' ? '$' : '₹'}{' '}
            {(customer.totalSpent ?? 0).toLocaleString('en-IN', {
              minimumFractionDigits: Number.isInteger(customer.totalSpent ?? 0) ? 0 : 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Email Address</span>
          <p className="text-xs font-medium text-stone-800 truncate" title={customer.email}>{customer.email || '—'}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">Primary Contact</span>
          <p className="text-xs font-medium text-stone-800 truncate">{customer.phone || '—'}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-sans font-bold uppercase text-stone-400">City & District</span>
          <p className="text-xs font-medium text-stone-800">{customer.addresses[0]?.city || '—'}</p>
        </div>
      </div>

      {/* Orders History & Saved Addresses */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Order History (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
          <h3 className="font-serif text-xl font-normal text-stone-900">
            Order History ({customer.recentOrders.length})
          </h3>
          {customer.recentOrders.length === 0 ? (
            <p className="text-stone-400 py-4">No orders yet.</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {customer.recentOrders.map(order => (
                <div key={order.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-16 rounded-lg bg-stone-100 flex-shrink-0 flex items-center justify-center text-stone-400">
                      <Package size={20} />
                    </div>
                    <div>
                      <p className="font-serif text-base font-medium text-stone-900">{order.orderNumber || '—'}</p>
                      <p className="text-stone-500">{formatOrderDate(order.createdAt)}</p>
                      <p className="font-bold text-[#561C08]">₹ {(order.totalAmount ?? 0).toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={prettyStatus(order.status)} size="sm" />
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
          )}
        </div>

        {/* Saved Addresses & Bespoke Size Card (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
              <MapPin size={16} className="text-allura-goldDark" />
              <span>Saved Delivery Addresses</span>
            </h3>
            {customer.addresses.length === 0 ? (
              <p className="text-stone-400">No saved addresses.</p>
            ) : (
              <div className="space-y-3">
                {customer.addresses.map(addr => (
                  <div key={addr.id} className="p-3 bg-stone-50 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase text-stone-400">{addr.label || '—'}</span>
                    <p className="font-bold text-stone-800">{addr.fullName || '—'}</p>
                    <p className="text-stone-600 leading-relaxed">
                      {addr.addressLine1 || '—'}, {addr.city || '—'}, {addr.state || '—'} - {addr.postalCode || '—'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
              <Scissors size={16} className="text-allura-goldDark" />
              <span>Bespoke Measurement Notes</span>
            </h3>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1">
              <p>Standard Size: <strong>{customer.sizePreferences?.preferredSize || 'Not available'}</strong></p>
              <p>Bust: {customer.sizePreferences?.bust || 'Not available'}</p>
              <p>Waist: {customer.sizePreferences?.waist || 'Not available'}</p>
              <p>Height: {customer.sizePreferences?.height || 'Not available'}</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
