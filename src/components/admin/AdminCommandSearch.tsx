import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Package, ShoppingBag, Users, Tag, Settings, ArrowRight, Truck, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getAdminOrders, orderErrorMessage } from '../../service/orders';
import { getAdminProducts } from '../../service/adminProducts';
import { getAdminCustomers, customerErrorMessage } from '../../service/customers';
import { getAdminCoupons, couponErrorMessage } from '../../service/coupons';
import { getBackendErrorMessage } from '../../utils/apiResponse';
import type { Order, AdminProduct, Coupon } from '../../types';
import type { CustomerProfile } from '../../types';

const SEARCH_DEBOUNCE_MS = 350;

export const AdminCommandSearch: React.FC = () => {
  const { isCommandOpen, setIsCommandOpen } = useAdmin();
  const { can } = usePermissions();
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const canViewOrders = can('order_processing', 'view');
  const canViewProducts = can('products_catalog', 'view');
  const canViewCustomers = can('customer_crm', 'view');
  const canViewCoupons = can('coupons_banners', 'view');

  // Orders are searched live against the backend (not AdminContext's mock
  // state) so results — and the links they navigate to — are real.
  const [matchedOrders, setMatchedOrders] = useState<Order[]>([]);
  const [isOrderSearchLoading, setIsOrderSearchLoading] = useState(false);
  const [orderSearchError, setOrderSearchError] = useState<string | null>(null);
  const orderRequestIdRef = useRef(0);

  // Products & coupons have no backend search param (same as their list
  // pages), so — like those pages — the full list is fetched once from the
  // real API and filtered client-side as the admin types.
  const [productItems, setProductItems] = useState<AdminProduct[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const productsLoadedRef = useRef(false);

  const [couponItems, setCouponItems] = useState<Coupon[]>([]);
  const [isCouponsLoading, setIsCouponsLoading] = useState(false);
  const [couponsError, setCouponsError] = useState<string | null>(null);
  const couponsLoadedRef = useRef(false);

  // Customers support a real backend `search` param, so — like Orders — this
  // is a live debounced, stale-guarded query rather than a one-time fetch.
  const [matchedCustomers, setMatchedCustomers] = useState<CustomerProfile[]>([]);
  const [isCustomerSearchLoading, setIsCustomerSearchLoading] = useState(false);
  const [customerSearchError, setCustomerSearchError] = useState<string | null>(null);
  const customerRequestIdRef = useRef(0);

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

  const cleanQuery = query.toLowerCase().trim();

  // Debounced live order search against GET /admin/orders?search=... — the
  // same endpoint and param the Orders page itself uses.
  useEffect(() => {
    if (!isCommandOpen || !canViewOrders || !cleanQuery) {
      orderRequestIdRef.current += 1;
      setMatchedOrders([]);
      setOrderSearchError(null);
      setIsOrderSearchLoading(false);
      return;
    }

    const requestId = ++orderRequestIdRef.current;
    const timer = setTimeout(async () => {
      setIsOrderSearchLoading(true);
      setOrderSearchError(null);
      try {
        const result = await getAdminOrders({ search: cleanQuery, limit: 3 });
        if (orderRequestIdRef.current !== requestId) return; // superseded by a newer query
        setMatchedOrders(result.orders);
      } catch (err) {
        if (orderRequestIdRef.current !== requestId) return;
        setMatchedOrders([]); // never leave stale results showing after a failure
        setOrderSearchError(orderErrorMessage(err, 'Could not search orders'));
      } finally {
        if (orderRequestIdRef.current === requestId) setIsOrderSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanQuery, canViewOrders, isCommandOpen]);

  // Products: fetch the real list once per session the search is opened
  // (same list AdminProductsPage.tsx fetches), then filter client-side as
  // the admin types — avoids firing an API request on every keystroke.
  useEffect(() => {
    if (!isCommandOpen || !canViewProducts || productsLoadedRef.current) return;
    productsLoadedRef.current = true;
    setIsProductsLoading(true);
    setProductsError(null);
    getAdminProducts()
      .then(list => setProductItems(list))
      .catch(err => {
        productsLoadedRef.current = false; // allow a retry next time the modal opens
        setProductItems([]);
        setProductsError(getBackendErrorMessage(err, 'Could not load products'));
      })
      .finally(() => setIsProductsLoading(false));
  }, [isCommandOpen, canViewProducts]);

  // Coupons: same one-time-fetch-then-filter approach as products — the
  // coupons endpoint has no search param either (AdminCouponsPage.tsx also
  // filters client-side).
  useEffect(() => {
    if (!isCommandOpen || !canViewCoupons || couponsLoadedRef.current) return;
    couponsLoadedRef.current = true;
    setIsCouponsLoading(true);
    setCouponsError(null);
    getAdminCoupons()
      .then(list => setCouponItems(list))
      .catch(err => {
        couponsLoadedRef.current = false;
        setCouponItems([]);
        setCouponsError(couponErrorMessage(err, 'Could not load coupons'));
      })
      .finally(() => setIsCouponsLoading(false));
  }, [isCommandOpen, canViewCoupons]);

  // Customers: real backend `search` param exists, so — like Orders — this
  // is a live debounced, stale-guarded query against GET /admin/customers.
  useEffect(() => {
    if (!isCommandOpen || !canViewCustomers || !cleanQuery) {
      customerRequestIdRef.current += 1;
      setMatchedCustomers([]);
      setCustomerSearchError(null);
      setIsCustomerSearchLoading(false);
      return;
    }

    const requestId = ++customerRequestIdRef.current;
    const timer = setTimeout(async () => {
      setIsCustomerSearchLoading(true);
      setCustomerSearchError(null);
      try {
        const result = await getAdminCustomers({ search: cleanQuery, limit: 3 });
        if (customerRequestIdRef.current !== requestId) return;
        setMatchedCustomers(result.customers);
      } catch (err) {
        if (customerRequestIdRef.current !== requestId) return;
        setMatchedCustomers([]);
        setCustomerSearchError(customerErrorMessage(err, 'Could not search customers'));
      } finally {
        if (customerRequestIdRef.current === requestId) setIsCustomerSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanQuery, canViewCustomers, isCommandOpen]);

  if (!isCommandOpen) return null;

  const matchedProducts = canViewProducts
    ? productItems.filter(
        p => p.name.toLowerCase().includes(cleanQuery) || p.sku.toLowerCase().includes(cleanQuery)
      ).slice(0, 3)
    : [];

  const matchedCoupons = canViewCoupons
    ? couponItems.filter(
        cp => cp.code.toLowerCase().includes(cleanQuery)
      ).slice(0, 2)
    : [];

  const handleSelect = (path: string) => {
    setIsCommandOpen(false);
    setQuery('');
    navigate(path);
  };

  const navShortcuts = [
    { label: 'Products Catalog', path: '/admin/products', icon: <Package size={14} />, module: 'products_catalog' as const },
    { label: 'Suppliers', path: '/admin/suppliers', icon: <Truck size={14} />, module: 'supplier_management' as const },
    { label: 'Order Processing', path: '/admin/orders', icon: <ShoppingBag size={14} />, module: 'order_processing' as const },
    { label: 'Stock Adjustments', path: '/admin/inventory', icon: <Package size={14} />, module: 'inventory_stock' as const },
    { label: 'Customer CRM', path: '/admin/customers', icon: <Users size={14} />, module: 'customer_crm' as const },
    { label: 'Coupons & Promos', path: '/admin/marketing/coupons', icon: <Tag size={14} />, module: 'coupons_banners' as const },
    { label: 'Store Settings', path: '/admin/settings', icon: <Settings size={14} />, module: 'system_settings' as const },
  ].filter(item => can(item.module, 'view'));

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

          {/* Matched Products — fetched live from the backend */}
          {canViewProducts && (isProductsLoading || matchedProducts.length > 0 || productsError) && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-allura-goldDark flex items-center gap-1">
                <Package size={12} />
                <span>Products {matchedProducts.length > 0 ? `(${matchedProducts.length})` : ''}</span>
                {isProductsLoading && <Loader2 size={11} className="animate-spin text-allura-muted" />}
              </span>
              {productsError ? (
                <p className="text-[11px] text-rose-700 px-0.5">{productsError}</p>
              ) : (
                matchedProducts.map(p => {
                  const primaryImage = p.images?.find(img => img.isPrimary)?.url || p.images?.[0]?.url;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelect(`/admin/products?edit=${p.id}`)}
                      className="p-2.5 rounded-xl bg-white border border-allura-border/60 hover:border-allura-gold hover:bg-allura-bg/40 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {primaryImage ? (
                          <img
                            src={primaryImage}
                            alt={p.name}
                            className="w-8 h-10 object-cover rounded bg-stone-100"
                          />
                        ) : (
                          <div className="w-8 h-10 rounded bg-stone-100" />
                        )}
                        <div>
                          <p className="font-serif text-sm text-allura-text font-medium">{p.name}</p>
                          <p className="text-[11px] text-allura-muted font-mono">
                            SKU: {p.sku} • ₹{p.pricing.sellingPrice.toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                      <ArrowRight size={13} className="text-allura-muted" />
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Matched Orders — searched live against the backend */}
          {canViewOrders && cleanQuery && (isOrderSearchLoading || matchedOrders.length > 0 || orderSearchError) && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <ShoppingBag size={12} />
                <span>Orders {matchedOrders.length > 0 ? `(${matchedOrders.length})` : ''}</span>
                {isOrderSearchLoading && <Loader2 size={11} className="animate-spin text-allura-muted" />}
              </span>
              {orderSearchError ? (
                <p className="text-[11px] text-rose-700 px-0.5">{orderSearchError}</p>
              ) : (
                matchedOrders.map(o => (
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
                ))
              )}
            </div>
          )}

          {/* Matched Customers — searched live against the backend */}
          {canViewCustomers && cleanQuery && (isCustomerSearchLoading || matchedCustomers.length > 0 || customerSearchError) && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-allura-softBrown flex items-center gap-1">
                <Users size={12} />
                <span>Customers {matchedCustomers.length > 0 ? `(${matchedCustomers.length})` : ''}</span>
                {isCustomerSearchLoading && <Loader2 size={11} className="animate-spin text-allura-muted" />}
              </span>
              {customerSearchError ? (
                <p className="text-[11px] text-rose-700 px-0.5">{customerSearchError}</p>
              ) : (
                matchedCustomers.map(c => (
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
                ))
              )}
            </div>
          )}

          {/* Matched Coupons — fetched live from the backend */}
          {canViewCoupons && (isCouponsLoading || matchedCoupons.length > 0 || couponsError) && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1">
                <Tag size={12} />
                <span>Coupons {matchedCoupons.length > 0 ? `(${matchedCoupons.length})` : ''}</span>
                {isCouponsLoading && <Loader2 size={11} className="animate-spin text-allura-muted" />}
              </span>
              {couponsError ? (
                <p className="text-[11px] text-rose-700 px-0.5">{couponsError}</p>
              ) : (
                matchedCoupons.map(cp => (
                  <div
                    key={cp.id}
                    onClick={() => handleSelect(`/admin/marketing/coupons`)}
                    className="p-2.5 rounded-xl bg-white border border-allura-border/60 hover:border-amber-500 hover:bg-amber-50/30 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-bold text-allura-darkBrown">{cp.code}</p>
                      <p className="text-[11px] text-allura-muted">
                        {cp.discountType === 'Percentage' ? `${cp.discountValue}% off` : `₹${cp.discountValue.toLocaleString('en-IN')} off`}
                        {' • '}{cp.status}
                      </p>
                    </div>
                    <ArrowRight size={13} className="text-allura-muted" />
                  </div>
                ))
              )}
            </div>
          )}

          {query && !isOrderSearchLoading && !orderSearchError && !isProductsLoading && !productsError
            && !isCustomerSearchLoading && !customerSearchError && !isCouponsLoading && !couponsError
            && matchedProducts.length === 0 && matchedOrders.length === 0 && matchedCustomers.length === 0 && matchedCoupons.length === 0 && (
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
