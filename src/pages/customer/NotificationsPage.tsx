import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Package, Tag, User, Truck, ArrowLeft, ArrowRight } from 'lucide-react';
import { useShop } from '../../context/ShopContext';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useShop();
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Orders', 'Shipping', 'Offers', 'Account'];

  const filtered = notifications.filter(
    n => activeCategory === 'All' || n.category === activeCategory
  );

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'Orders':
        return <Package size={16} className="text-allura-gold" />;
      case 'Shipping':
        return <Truck size={16} className="text-emerald-700" />;
      case 'Offers':
        return <Tag size={16} className="text-amber-700" />;
      default:
        return <User size={16} className="text-allura-softBrown" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-allura-border/60 pb-6">
        <div>
          <Link
            to="/account"
            className="inline-flex items-center gap-1.5 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors mb-2"
          >
            <ArrowLeft size={14} />
            <span>Back to Account</span>
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl text-allura-text font-normal">
            Notifications Center
          </h1>
          <p className="text-xs font-sans text-allura-muted mt-1">
            Real-time updates on your boutique orders, tracking milestones, and private offers.
          </p>
        </div>

        <button
          onClick={markAllNotificationsAsRead}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-allura-border rounded-xl text-xs font-sans font-semibold text-allura-text hover:bg-allura-bgSecondary transition-colors"
        >
          <CheckCheck size={14} />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-allura-border/40">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs font-sans font-semibold transition-colors whitespace-nowrap ${
              activeCategory === cat
                ? 'bg-allura-darkBrown text-white shadow-xs'
                : 'bg-allura-card text-allura-muted hover:text-allura-text border border-allura-border'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="bg-allura-card border border-allura-border rounded-2xl p-12 text-center space-y-3 shadow-subtle">
          <div className="w-12 h-12 rounded-full bg-allura-bgSecondary text-allura-goldDark flex items-center justify-center mx-auto">
            <Bell size={24} />
          </div>
          <h3 className="font-serif text-lg text-allura-text">No notifications in this category</h3>
          <p className="text-xs font-sans text-allura-muted">You are up to date with all your boutique activities.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notif => (
            <div
              key={notif.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                notif.isRead
                  ? 'bg-allura-card border-allura-border/60 text-allura-muted'
                  : 'bg-white border-allura-gold/40 shadow-xs text-allura-text'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-full bg-allura-bgSecondary/80 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(notif.category)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif text-base font-normal text-allura-text">
                      {notif.title}
                    </h4>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-allura-gold" />
                    )}
                  </div>
                  <p className="text-xs font-sans text-allura-muted leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-[10px] font-sans text-allura-muted/70">
                      {notif.timestamp}
                    </span>
                    {notif.actionUrl && (
                      <Link
                        to={notif.actionUrl}
                        className="text-[11px] font-sans font-bold text-allura-goldDark hover:underline inline-flex items-center gap-1"
                      >
                        <span>{notif.actionLabel || 'View Details'}</span>
                        <ArrowRight size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              {!notif.isRead && (
                <button
                  onClick={() => markNotificationAsRead(notif.id)}
                  title="Mark as read"
                  className="p-1.5 text-allura-muted hover:text-emerald-700 transition-colors"
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
