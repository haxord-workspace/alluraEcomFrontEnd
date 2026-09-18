import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, 
  MapPin, 
  Scissors, 
  MessageCircle, 
  Sparkles, 
  Bell, 
  ArrowRight, 
  Plus, 
  FileText, 
  Truck 
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { StatusBadge } from '../components/common/StatusBadge';
import { RecentlyViewed } from '../components/customer/RecentlyViewed';
import { InvoiceModal } from '../components/common/InvoiceModal';

export const AccountPage: React.FC = () => {
  const {
    customer,
    orders,
    wishlist,
    notifications,
    formatPrice,
    invoiceOrder,
    setInvoiceOrder,
    completeProfile,
    showToast,
  } = useShop();

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'addresses' | 'sizes' | 'notifications'>('overview');

  // Address edit modal simulation
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    addressLine1: '',
    city: 'Perinthalmanna',
    district: 'Malappuram',
    state: 'Kerala',
    pincode: '679322',
    type: 'Home' as const,
  });

  const recentOrder = orders[0];

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const added = {
      id: `addr-${Date.now()}`,
      ...newAddress,
      isDefault: customer.addresses.length === 0,
    };
    completeProfile({
      addresses: [...customer.addresses, added],
    });
    setIsAddAddressOpen(false);
    showToast('New delivery address saved', 'success');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Account Profile Header */}
      <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-allura-bgSecondary text-allura-goldDark font-serif text-2xl font-bold flex items-center justify-center border-2 border-allura-gold flex-shrink-0 shadow-sm">
            {customer?.name?.charAt(0) || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="text-[10px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
                ALLURA CIRCLE {customer?.circleTier?.toUpperCase() || 'MEMBER'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-allura-gold" />
              <span className="text-[10px] font-sans text-emerald-700 font-semibold">VIP Privilege Active</span>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">
              {customer?.name || 'Ananya Menon'}
            </h1>
            <p className="text-xs text-allura-muted font-sans mt-0.5">
              {customer?.phone || '+91 98471 23456'} • {customer?.email || 'ananya.kerala@example.com'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="https://wa.me/919037991774?text=Hello%20Allura%20Stylist%2C%20I%20am%20an%20Allura%20Circle%20member%20and%20need%20assistance."
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366]/10 text-[#128C7E] border border-[#25D366]/30 px-4 py-2.5 rounded-xl text-xs font-sans font-bold tracking-wider uppercase transition-colors flex items-center gap-2 hover:bg-[#25D366]/20"
          >
            <MessageCircle size={15} />
            <span>Dedicated Stylist</span>
          </a>

          <Link
            to="/auth/complete-profile"
            className="px-4 py-2.5 rounded-xl border border-allura-border text-xs font-sans font-semibold text-allura-muted hover:text-allura-text hover:bg-allura-bgSecondary transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-allura-border gap-6 sm:gap-10 text-xs font-sans font-bold tracking-wider uppercase overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Overview', icon: <Sparkles size={15} /> },
          { id: 'orders', label: `Orders (${orders.length})`, icon: <Package size={15} /> },
          { id: 'addresses', label: `Saved Addresses (${customer?.addresses?.length || 0})`, icon: <MapPin size={15} /> },
          { id: 'sizes', label: 'Size Preferences', icon: <Scissors size={15} /> },
          { id: 'notifications', label: `Notifications (${notifications.filter(n => !n.isRead).length})`, icon: <Bell size={15} /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 transition-colors flex items-center gap-2 relative whitespace-nowrap ${
              activeTab === tab.id ? 'text-allura-goldDark' : 'text-allura-muted hover:text-allura-text'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-allura-gold rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-allura-card border border-allura-border rounded-2xl p-5 shadow-subtle space-y-1">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">Total Orders</span>
              <p className="font-serif text-2xl font-bold text-allura-darkBrown">{orders.length}</p>
            </div>
            <div className="bg-allura-card border border-allura-border rounded-2xl p-5 shadow-subtle space-y-1">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">Wishlist Items</span>
              <p className="font-serif text-2xl font-bold text-allura-darkBrown">{wishlist.length}</p>
            </div>
            <div className="bg-allura-card border border-allura-border rounded-2xl p-5 shadow-subtle space-y-1">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">Preferred Size</span>
              <p className="font-serif text-2xl font-bold text-allura-goldDark">{customer?.sizePreferences?.preferredSize || 'M'}</p>
            </div>
            <div className="bg-allura-card border border-allura-border rounded-2xl p-5 shadow-subtle space-y-1">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">Allura Tier</span>
              <p className="font-serif text-2xl font-bold text-emerald-800">{customer?.circleTier || 'Gold'}</p>
            </div>
          </div>

          {/* Recent Order Banner */}
          {recentOrder && (
            <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-allura-border/60">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
                    MOST RECENT ATELIER ORDER
                  </span>
                  <StatusBadge status={recentOrder.orderStatus} />
                </div>
                <Link
                  to={`/account/orders/${recentOrder.id}`}
                  className="text-xs font-sans font-bold text-allura-goldDark hover:underline flex items-center gap-1"
                >
                  <span>View Complete Details</span>
                  <ArrowRight size={13} />
                </Link>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={recentOrder.items[0]?.product.images.primary}
                    alt={recentOrder.items[0]?.product.name}
                    className="w-16 h-20 object-cover rounded-xl bg-allura-bgSecondary flex-shrink-0"
                  />
                  <div className="space-y-1 text-xs font-sans">
                    <p className="font-serif text-base font-normal text-allura-text">
                      {recentOrder.items[0]?.product.name}
                    </p>
                    <p className="text-allura-muted">
                      Order: <strong>{recentOrder.orderNumber}</strong> • Placed on {recentOrder.date}
                    </p>
                    <p className="font-bold text-allura-darkBrown">
                      {formatPrice(recentOrder.total)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    to={`/account/orders/${recentOrder.id}/tracking`}
                    className="px-4 py-2 bg-allura-gold/15 text-allura-goldDark border border-allura-gold/30 rounded-xl text-xs font-sans font-bold hover:bg-allura-gold/25 transition-colors flex items-center gap-1.5"
                  >
                    <Truck size={14} />
                    <span>Track Shipment</span>
                  </Link>

                  <button
                    onClick={() => setInvoiceOrder(recentOrder)}
                    className="px-4 py-2 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-text hover:bg-allura-bgSecondary transition-colors flex items-center gap-1.5"
                  >
                    <FileText size={14} />
                    <span>Invoice</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recently Viewed in Account */}
          <RecentlyViewed />
        </div>
      )}

      {/* TAB 2: ORDERS LIST */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-2xl text-allura-text font-normal">Order History</h2>
            <Link
              to="/account/orders"
              className="text-xs font-sans font-bold text-allura-goldDark hover:underline flex items-center gap-1"
            >
              <span>Manage & Filter Orders</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="space-y-4">
            {orders.map(order => (
              <div
                key={order.id}
                className="bg-allura-card border border-allura-border rounded-2xl p-5 sm:p-6 shadow-subtle space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-allura-border/60 text-xs font-sans">
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-base font-bold text-allura-darkBrown">{order.orderNumber}</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-allura-muted">{order.date}</span>
                    <span className="text-stone-300">•</span>
                    <StatusBadge status={order.orderStatus} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base font-bold text-allura-darkBrown">{formatPrice(order.total)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={order.items[0]?.product.images.primary}
                      alt={order.items[0]?.product.name}
                      className="w-14 h-18 object-cover rounded-lg bg-allura-bgSecondary"
                    />
                    <div className="text-xs font-sans space-y-0.5">
                      <p className="font-serif text-sm text-allura-text">{order.items[0]?.product.name}</p>
                      <p className="text-allura-muted">Size: {order.items[0]?.selectedSize} • {order.items.length} item(s)</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/account/orders/${order.id}`}
                      className="px-3 py-1.5 border border-allura-border text-xs font-sans font-semibold rounded-lg hover:bg-allura-bgSecondary"
                    >
                      Details
                    </Link>
                    <Link
                      to={`/account/orders/${order.id}/tracking`}
                      className="px-3 py-1.5 bg-allura-gold/15 text-allura-goldDark border border-allura-gold/30 text-xs font-sans font-bold rounded-lg hover:bg-allura-gold/25"
                    >
                      Track
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ADDRESSES */}
      {activeTab === 'addresses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-serif text-2xl text-allura-text font-normal">Saved Addresses</h2>
              <p className="text-xs font-sans text-allura-muted">Manage your home and work delivery locations.</p>
            </div>
            <button
              onClick={() => setIsAddAddressOpen(true)}
              className="px-4 py-2 bg-allura-darkBrown hover:bg-allura-softBrown text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add New Address</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customer?.addresses.map(addr => (
              <div
                key={addr.id}
                className="bg-allura-card border border-allura-border rounded-2xl p-5 shadow-subtle space-y-3 relative"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-allura-bgSecondary px-2 py-0.5 rounded text-allura-darkBrown">
                    {addr.type}
                  </span>
                  {addr.isDefault && (
                    <span className="text-[10px] font-sans font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                      Default Address
                    </span>
                  )}
                </div>

                <div className="text-xs font-sans text-allura-muted space-y-1">
                  <p className="font-bold text-allura-text text-sm">{addr.name}</p>
                  <p>{addr.addressLine1}</p>
                  {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                  <p>{addr.city}, {addr.district} - {addr.pincode}</p>
                  <p>{addr.state}, India</p>
                  <p className="pt-1 text-allura-text">Phone: {addr.phone}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Add Address Form Modal */}
          {isAddAddressOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-allura-darkBrown/60 backdrop-blur-sm">
              <div className="bg-allura-card border border-allura-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-luxury">
                <h3 className="font-serif text-xl text-allura-text font-normal">Add Delivery Address</h3>
                <form onSubmit={handleAddAddress} className="space-y-3 text-xs font-sans">
                  <div>
                    <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newAddress.name}
                      onChange={e => setNewAddress({ ...newAddress, name: e.target.value })}
                      className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      value={newAddress.phone}
                      onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })}
                      className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">Address Line</label>
                    <input
                      type="text"
                      required
                      placeholder="House/Flat, Street, Area"
                      value={newAddress.addressLine1}
                      onChange={e => setNewAddress({ ...newAddress, addressLine1: e.target.value })}
                      className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">City</label>
                      <input
                        type="text"
                        required
                        value={newAddress.city}
                        onChange={e => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-allura-muted uppercase text-[10px] mb-1">Pincode</label>
                      <input
                        type="text"
                        required
                        value={newAddress.pincode}
                        onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })}
                        className="w-full p-2.5 bg-allura-bg border border-allura-border rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsAddAddressOpen(false)}
                      className="px-4 py-2 border border-allura-border rounded-xl text-allura-muted"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-allura-darkBrown text-white rounded-xl font-bold uppercase tracking-wider"
                    >
                      Save Address
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SIZES */}
      {activeTab === 'sizes' && (
        <div className="bg-allura-card border border-allura-border rounded-2xl p-6 sm:p-8 shadow-subtle space-y-6">
          <div className="space-y-1">
            <h2 className="font-serif text-2xl text-allura-text font-normal">Bespoke Size Profile</h2>
            <p className="text-xs font-sans text-allura-muted">
              Save your body measurements for personalized fit recommendations and complimentary tailoring.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans">
            <div className="p-4 bg-allura-bg/60 rounded-xl border border-allura-border">
              <span className="text-allura-muted uppercase text-[10px] font-bold">Standard Size</span>
              <p className="font-serif text-xl font-bold text-allura-darkBrown mt-1">{customer?.sizePreferences?.preferredSize || 'M'}</p>
            </div>
            <div className="p-4 bg-allura-bg/60 rounded-xl border border-allura-border">
              <span className="text-allura-muted uppercase text-[10px] font-bold">Bust Size</span>
              <p className="font-serif text-xl font-bold text-allura-darkBrown mt-1">{customer?.sizePreferences?.bust || '36 in'}</p>
            </div>
            <div className="p-4 bg-allura-bg/60 rounded-xl border border-allura-border">
              <span className="text-allura-muted uppercase text-[10px] font-bold">Waist</span>
              <p className="font-serif text-xl font-bold text-allura-darkBrown mt-1">{customer?.sizePreferences?.waist || '28 in'}</p>
            </div>
            <div className="p-4 bg-allura-bg/60 rounded-xl border border-allura-border">
              <span className="text-allura-muted uppercase text-[10px] font-bold">Hip</span>
              <p className="font-serif text-xl font-bold text-allura-darkBrown mt-1">{customer?.sizePreferences?.hip || '39 in'}</p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs font-sans text-amber-900 flex items-center gap-3">
            <Scissors size={20} className="text-amber-700 flex-shrink-0" />
            <span>
              All Allura garments feature our signature 2-inch interior seam allowance for seamless bespoke alteration.
            </span>
          </div>
        </div>
      )}

      {/* TAB 5: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-2xl text-allura-text font-normal">Recent Alerts</h2>
            <Link to="/account/notifications" className="text-xs font-sans font-bold text-allura-goldDark hover:underline">
              View All Notifications Center →
            </Link>
          </div>
          <div className="space-y-3">
            {notifications.slice(0, 3).map(notif => (
              <div
                key={notif.id}
                className="bg-allura-card border border-allura-border rounded-xl p-4 flex items-start gap-3 text-xs font-sans"
              >
                <div className="w-8 h-8 rounded-full bg-allura-bgSecondary flex items-center justify-center flex-shrink-0">
                  <Bell size={14} className="text-allura-gold" />
                </div>
                <div className="space-y-1">
                  <p className="font-serif text-sm font-medium text-allura-text">{notif.title}</p>
                  <p className="text-allura-muted">{notif.message}</p>
                  <span className="text-[10px] text-allura-muted/70">{notif.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
    </div>
  );
};
