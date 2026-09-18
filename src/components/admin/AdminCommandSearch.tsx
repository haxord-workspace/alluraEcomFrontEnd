import React, { useState, useEffect } from 'react';
import { Search, X, Package, ShoppingBag, Users, Tag, Settings, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';

export const AdminCommandSearch: React.FC = () => {
  const { isCommandOpen, setIsCommandOpen, products, orders, customers, coupons, hasPermission } = useAdmin();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandOpen(!isCommandOpen);
      } else if (e.key === 'Escape' && isCommandOpen) {
        setIsCommandOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandOpen, setIsCommandOpen]);

  if (!isCommandOpen) return null;

  const cleanQuery = query.toLowerCase().trim();

  const matchedProducts = hasPermission('products')
    ? products.filter(
        p => p.name.toLowerCase().includes(cleanQuery) || p.sku.toLowerCase().includes(cleanQuery)
      ).slice(0, 3)
    : [];

  const matchedOrders = hasPermission('orders')
    ? orders.filter(
        o => o.orderNumber.toLowerCase().includes(cleanQuery) || o.customer.name.toLowerCase().includes(cleanQuery)
      ).slice(0, 3)
    : [];

  const matchedCustomers = hasPermission('customers')
    ? customers.filter(
        c => c.name.toLowerCase().includes(cleanQuery) || c.email.toLowerCase().includes(cleanQuery)
      ).slice(0, 3)
    : [];

  const matchedCoupons = hasPermission('marketing')
    ? coupons.filter(
        cp => cp.code.toLowerCase().includes(cleanQuery)
      ).slice(0, 2)
    : [];

  const handleSelect = (path: string) => {
    setIsCommandOpen(false);
    setQuery('');
    navigate(path);
  };

  const navShortcuts = [
    { label: 'Products Catalog', path: '/admin/products', icon: <Package size={14} />, module: 'products' as const },
    { label: 'Order Processing', path: '/admin/orders', icon: <ShoppingBag size={14} />, module: 'orders' as const },
    { label: 'Stock Adjustments', path: '/admin/inventory', icon: <Package size={14} />, module: 'inventory' as const },
    { label: 'Customer CRM', path: '/admin/customers', icon: <Users size={14} />, module: 'customers' as const },
    { label: 'Coupons & Promos', path: '/admin/marketing/coupons', icon: <Tag size={14} />, module: 'marketing' as const },
    { label: 'Store Settings', path: '/admin/settings', icon: <Settings size={14} />, module: 'settings' as const },
  ].filter(item => hasPermission(item.module));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-allura-darkBrown/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-allura-card border border-allura-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[80vh]">
        {/* Search input header */}
        <div className="p-4 border-b border-allura-border flex items-center gap-3 bg-white">
          <Search size={18} className="text-allura-goldDark flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, orders, customers, SKU, barcodes, or settings..."
            className="flex-1 bg-transparent text-sm font-sans text-allura-text focus:outline-none placeholder:text-allura-muted/60"
          />
          <span className="text-[10px] font-mono bg-stone-100 text-stone-500 px-2 py-0.5 rounded border border-stone-200">
            ESC
          </span>
          <button
            onClick={() => setIsCommandOpen(false)}
            className="p-1 text-allura-muted hover:text-allura-text rounded-md"
          >
            <X size={18} />
          </button>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs font-sans">
          
          {/* Quick Admin Navigation Shortcuts */}
          {!query && (
            <div className="space-y-2">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-allura-muted">
                QUICK NAVIGATION
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {navShortcuts.map(item => (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className="p-2.5 rounded-xl border border-allura-border/70 hover:border-allura-gold hover:bg-allura-bg flex items-center gap-2 text-allura-text transition-colors text-left"
                  >
                    <span className="text-allura-goldDark">{item.icon}</span>
                    <span className="truncate font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Products */}
          {matchedProducts.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-allura-goldDark flex items-center gap-1">
                <Package size={12} />
                <span>Products ({matchedProducts.length})</span>
              </span>
              {matchedProducts.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(`/admin/products/${p.id}/edit`)}
                  className="p-2.5 rounded-xl bg-white border border-allura-border/60 hover:border-allura-gold hover:bg-allura-bg/40 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images.primary}
                      alt={p.name}
                      className="w-8 h-10 object-cover rounded bg-stone-100"
                    />
                    <div>
                      <p className="font-serif text-sm text-allura-text font-medium">{p.name}</p>
                      <p className="text-[11px] text-allura-muted font-mono">SKU: {p.sku} • ₹{p.price.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <ArrowRight size={13} className="text-allura-muted" />
                </div>
              ))}
            </div>
          )}

          {/* Matched Orders */}
          {matchedOrders.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <ShoppingBag size={12} />
                <span>Orders ({matchedOrders.length})</span>
              </span>
              {matchedOrders.map(o => (
                <div
                  key={o.id}
                  onClick={() => handleSelect(`/admin/orders/${o.id}`)}
                  className="p-2.5 rounded-xl bg-white border border-allura-border/60 hover:border-emerald-500 hover:bg-emerald-50/30 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-serif text-sm font-bold text-allura-darkBrown">{o.orderNumber}</p>
                    <p className="text-[11px] text-allura-muted">Customer: {o.customer.name} • Total: ₹{o.total.toLocaleString('en-IN')} • Status: {o.orderStatus}</p>
                  </div>
                  <ArrowRight size={13} className="text-allura-muted" />
                </div>
              ))}
            </div>
          )}

          {/* Matched Customers */}
          {matchedCustomers.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-allura-softBrown flex items-center gap-1">
                <Users size={12} />
                <span>Customers ({matchedCustomers.length})</span>
              </span>
              {matchedCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(`/admin/customers/${c.id}`)}
                  className="p-2.5 rounded-xl bg-white border border-allura-border/60 hover:border-allura-gold hover:bg-allura-bg/40 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-medium text-allura-text">{c.name}</p>
                    <p className="text-[11px] text-allura-muted">{c.email} • {c.phone}</p>
                  </div>
                  <ArrowRight size={13} className="text-allura-muted" />
                </div>
              ))}
            </div>
          )}

          {/* Matched Coupons */}
          {matchedCoupons.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <Tag size={12} />
                <span>Coupons ({matchedCoupons.length})</span>
              </span>
              {matchedCoupons.map(cp => (
                <div
                  key={cp.id}
                  onClick={() => handleSelect(`/admin/marketing/coupons`)}
                  className="p-2.5 rounded-xl bg-white border border-allura-border/60 hover:border-amber-500 hover:bg-amber-50/30 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <p className="font-bold text-allura-darkBrown">{cp.code}</p>
                    <p className="text-[11px] text-allura-muted">{cp.description}</p>
                  </div>
                  <ArrowRight size={13} className="text-allura-muted" />
                </div>
              ))}
            </div>
          )}

          {query && matchedProducts.length === 0 && matchedOrders.length === 0 && matchedCustomers.length === 0 && matchedCoupons.length === 0 && (
            <div className="p-8 text-center space-y-2 text-allura-muted">
              <p className="font-medium text-allura-text">No matches found for "{query}"</p>
              <p className="text-[11px]">Try searching with a SKU code, customer phone, or order ID.</p>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="bg-stone-50 px-4 py-2 border-t border-stone-200 text-[10px] text-stone-500 flex justify-between items-center">
          <span>Tip: Press <strong>⌘K</strong> / <strong>Ctrl+K</strong> from anywhere in admin</span>
          <span>Allura Enterprise Operations</span>
        </div>
      </div>
    </div>
  );
};
