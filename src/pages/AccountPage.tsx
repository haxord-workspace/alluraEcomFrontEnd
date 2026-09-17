import React, { useState } from 'react';
import { Package, MapPin, Scissors, MessageCircle, Sparkles } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const AccountPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'sizes'>('orders');
  const { formatPrice } = useShop();

  const mockOrders = [
    {
      id: 'ALR-849201',
      date: '10 September 2026',
      status: 'In Transit from Perinthalmanna Atelier',
      statusColor: 'text-amber-700 bg-amber-50',
      total: 8999,
      items: [
        {
          name: 'Embroidered Anarkali Set',
          size: 'M',
          color: 'Ivory Gold',
          image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=300&q=80',
        },
      ],
    },
    {
      id: 'ALR-720194',
      date: '24 August 2026',
      status: 'Delivered',
      statusColor: 'text-emerald-700 bg-emerald-50',
      total: 5499,
      items: [
        {
          name: 'Pleated Co-ord Set',
          size: 'M',
          color: 'Mauve Rose',
          image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80',
        },
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Account Profile Header */}
      <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-allura-bgSecondary text-allura-goldDark font-serif text-2xl font-bold flex items-center justify-center border-2 border-allura-gold">
            A
          </div>
          <div>
            <span className="text-[10px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark">
              ALLURA CIRCLE MEMBER
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl text-allura-text font-normal">
              Ananya Menon
            </h1>
            <p className="text-xs text-allura-muted font-sans">+91 98471 23456 • ananya.kerala@example.com</p>
          </div>
        </div>

        <a
          href="https://wa.me/919037991774?text=Hello%20Allura%20Stylist%2C%20I%20need%20assistance%20with%20my%20order."
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366]/10 text-[#128C7E] border border-[#25D366]/30 px-4 py-2.5 rounded text-xs font-sans font-bold tracking-wider uppercase transition-colors flex items-center gap-2"
        >
          <MessageCircle size={15} />
          <span>My Dedicated Stylist</span>
        </a>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-allura-border gap-6 sm:gap-10 text-xs font-sans font-bold tracking-wider uppercase overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 transition-colors flex items-center gap-2 relative ${
            activeTab === 'orders' ? 'text-allura-goldDark' : 'text-allura-muted hover:text-allura-text'
          }`}
        >
          <Package size={15} />
          <span>Order History ({mockOrders.length})</span>
          {activeTab === 'orders' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-allura-gold rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('addresses')}
          className={`pb-3 transition-colors flex items-center gap-2 relative ${
            activeTab === 'addresses' ? 'text-allura-goldDark' : 'text-allura-muted hover:text-allura-text'
          }`}
        >
          <MapPin size={15} />
          <span>Saved Addresses</span>
          {activeTab === 'addresses' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-allura-gold rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('sizes')}
          className={`pb-3 transition-colors flex items-center gap-2 relative ${
            activeTab === 'sizes' ? 'text-allura-goldDark' : 'text-allura-muted hover:text-allura-text'
          }`}
        >
          <Scissors size={15} />
          <span>Bespoke Size Profile</span>
          {activeTab === 'sizes' && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-allura-gold rounded-full" />
          )}
        </button>
      </div>

      {/* Tab 1: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fade-in">
          {mockOrders.map(order => (
            <div
              key={order.id}
              className="bg-allura-card rounded-2xl border border-allura-border p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-allura-border/60 gap-2">
                <div>
                  <span className="text-xs font-serif font-bold text-allura-darkBrown">
                    Order {order.id}
                  </span>
                  <p className="text-[11px] text-allura-muted font-sans">Placed on {order.date}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded ${order.statusColor}`}>
                    {order.status}
                  </span>
                  <span className="font-serif font-bold text-sm text-allura-text">
                    {formatPrice(order.total)}
                  </span>
                </div>
              </div>

              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-20 object-cover object-top rounded bg-allura-bgSecondary"
                  />
                  <div className="text-xs space-y-1">
                    <h4 className="font-serif text-sm font-semibold text-allura-text">{item.name}</h4>
                    <p className="text-allura-muted font-sans">Size: {item.size} • Color: {item.color}</p>
                    <a
                      href={`https://wa.me/919037991774?text=Hello%20Allura%2C%20tracking%20update%20for%20order%20${order.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-allura-goldDark font-semibold underline text-[11px] inline-block"
                    >
                      Track Shipment on WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Addresses */}
      {activeTab === 'addresses' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-fade-in">
          <div className="bg-allura-card p-6 rounded-xl border-2 border-allura-gold space-y-2 relative">
            <span className="text-[10px] bg-allura-gold text-allura-card px-2 py-0.5 rounded font-bold uppercase">
              DEFAULT ADDRESS
            </span>
            <h4 className="font-serif text-base font-semibold text-allura-text">Ananya Menon</h4>
            <p className="text-xs text-allura-muted font-sans leading-relaxed">
              Near Jubilee Hospital, Ooty Road<br />
              Perinthalmanna, Malappuram, Kerala - 679322<br />
              Phone: +91 98471 23456
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: Size Profile */}
      {activeTab === 'sizes' && (
        <div className="bg-allura-card p-6 sm:p-8 rounded-2xl border border-allura-border space-y-4 animate-fade-in max-w-xl">
          <div className="flex items-center gap-2 text-allura-goldDark font-sans font-bold text-xs uppercase tracking-wider">
            <Sparkles size={14} />
            <span>SAVED ATELIER MEASUREMENTS</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs font-sans">
            <div className="p-3 bg-allura-bg rounded border border-allura-border text-center">
              <span className="text-allura-muted block">Bust</span>
              <strong className="text-sm text-allura-text">36 in</strong>
            </div>
            <div className="p-3 bg-allura-bg rounded border border-allura-border text-center">
              <span className="text-allura-muted block">Waist</span>
              <strong className="text-sm text-allura-text">30 in</strong>
            </div>
            <div className="p-3 bg-allura-bg rounded border border-allura-border text-center">
              <span className="text-allura-muted block">Kurta Length</span>
              <strong className="text-sm text-allura-text">50 in</strong>
            </div>
          </div>
          <p className="text-xs text-allura-muted font-sans pt-2">
            These measurements help our stylists pre-filter sizes and prepare custom alterations.
          </p>
        </div>
      )}
    </div>
  );
};
