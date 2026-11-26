import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  getSalesAnalytics,
  getProductAnalytics,
  getFunnelAnalytics,
  getTrackingStatus,
  analyticsErrorMessage,
} from '../../service/analytics';
import type {
  SalesAnalytics,
  ProductAnalyticsItem,
  ProductAnalyticsResponse,
  ProductRankBy,
  FunnelAnalytics,
  TrackingStatus,
} from '../../types/analytics';
import { Radio, RefreshCw, Loader2, Search, X, Info, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { ConversionFunnelChart } from '../../components/admin/analytics/ConversionFunnelChart';

// ── Products table: search/filter/sort are partly client-side — see Step 3 note ──
type ProductsSort = 'revenue' | 'unitsSold' | 'views' | 'purchases' | 'conversion';
type ProductsFilter = 'all' | 'hasViews' | 'noViews' | 'highConversion' | 'cartAbandoned';

const DEFAULT_PRODUCTS_SORT: ProductsSort = 'revenue';
const DEFAULT_PRODUCTS_FILTER: ProductsFilter = 'all';
const DEFAULT_PRODUCTS_LIMIT = 20;

const PRODUCTS_SORT_OPTIONS: { value: ProductsSort; label: string }[] = [
  { value: 'revenue', label: 'Gross Revenue (High to Low)' },
  { value: 'unitsSold', label: 'Units Sold' },
  { value: 'views', label: 'Views' },
  { value: 'purchases', label: 'Purchases' },
  { value: 'conversion', label: 'Conversion %' },
];

const PRODUCTS_FILTER_OPTIONS: { value: ProductsFilter; label: string }[] = [
  { value: 'all', label: 'All products' },
  { value: 'hasViews', label: 'Has views' },
  { value: 'noViews', label: 'No views' },
  { value: 'highConversion', label: 'High conversion (≥ 20%)' },
  { value: 'cartAbandoned', label: 'Cart abandoned (add to cart > purchases)' },
];

// Only these 4 sorts map to the API's `rankBy` param — 'purchases' has no server
// equivalent, so it's sorted on the client (see Step 3 note in the final report).
const RANK_BY_MAP: Partial<Record<ProductsSort, ProductRankBy>> = {
  revenue: 'revenue',
  unitsSold: 'unitsSold',
  views: 'views',
  conversion: 'conversion',
};

const sortProducts = (items: ProductAnalyticsItem[], sort: ProductsSort): ProductAnalyticsItem[] => {
  const key: Record<ProductsSort, keyof ProductAnalyticsItem> = {
    revenue: 'grossRevenue',
    unitsSold: 'unitsSold',
    views: 'views',
    purchases: 'purchaseCount',
    conversion: 'conversionRate',
  };
  const field = key[sort];
  return [...items].sort((a, b) => (b[field] as number) - (a[field] as number));
};

const matchesProductsFilter = (item: ProductAnalyticsItem, filter: ProductsFilter): boolean => {
  switch (filter) {
    case 'hasViews':
      return item.views > 0;
    case 'noViews':
      return item.views === 0;
    case 'highConversion':
      return item.conversionRate >= 20;
    case 'cartAbandoned':
      return item.addToCartCount > item.purchaseCount;
    default:
      return true;
  }
};

/** "33.33%", or "—" when there's no tracking data behind the rate (not a real 0%) */
const formatRate = (rate: number, hasTrackingData: boolean): string =>
  hasTrackingData ? `${rate.toFixed(2).replace(/\.00$/, '')}%` : '—';

const roundRate = (n: number) => Math.round(n * 100) / 100;

interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  /** Category totals, shaped like a product row so the same cells / sort can render it */
  summary: ProductAnalyticsItem;
  products: ProductAnalyticsItem[];
}

/** Groups the flat product list by categoryId and sums each category's metrics */
const groupProductsByCategory = (items: ProductAnalyticsItem[], sort: ProductsSort): CategoryGroup[] => {
  const groups = new Map<string, CategoryGroup>();
  for (const p of items) {
    let group = groups.get(p.categoryId);
    if (!group) {
      group = {
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        products: [],
        summary: {
          productId: p.categoryId,
          name: p.categoryName,
          categoryId: p.categoryId,
          categoryName: p.categoryName,
          unitsSold: 0,
          grossRevenue: 0,
          views: 0,
          addToCartCount: 0,
          purchaseCount: 0,
          conversionRate: 0,
          cartToPurchaseRate: 0,
        },
      };
      groups.set(p.categoryId, group);
    }
    group.products.push(p);
    group.summary.unitsSold += p.unitsSold;
    group.summary.grossRevenue += p.grossRevenue;
    group.summary.views += p.views;
    group.summary.addToCartCount += p.addToCartCount;
    group.summary.purchaseCount += p.purchaseCount;
  }

  const list = [...groups.values()];
  for (const g of list) {
    const s = g.summary;
    s.conversionRate = s.views > 0 ? roundRate((s.purchaseCount / s.views) * 100) : 0;
    s.cartToPurchaseRate = s.addToCartCount > 0 ? roundRate((s.purchaseCount / s.addToCartCount) * 100) : 0;
    g.products = sortProducts(g.products, sort);
  }
  const order = sortProducts(list.map(g => g.summary), sort).map(s => s.categoryId);
  return order.map(id => groups.get(id)!);
};

/** Units sold → cart-to-purchase cells, shared by the category rows and the product tables */
const MetricCells: React.FC<{ item: ProductAnalyticsItem }> = ({ item: p }) => {
  const hasConversionData = p.views > 0;
  const hasCartToPurchaseData = p.addToCartCount > 0;
  return (
    <>
      <td className="p-4 font-bold text-[#561C08]">{p.unitsSold} unit{p.unitsSold === 1 ? '' : 's'}</td>
      <td className="p-4 text-right font-serif font-bold text-[#561C08] text-sm">
        ₹ {p.grossRevenue.toLocaleString('en-IN')}
      </td>
      <td className="p-4 text-right text-stone-700">{p.views.toLocaleString('en-IN')}</td>
      <td className="p-4 text-right text-stone-700">{p.addToCartCount.toLocaleString('en-IN')}</td>
      <td className="p-4 text-right text-stone-700">{p.purchaseCount.toLocaleString('en-IN')}</td>
      <td className="p-4 text-right text-stone-700">{formatRate(p.conversionRate, hasConversionData)}</td>
      <td className="p-4 text-right text-stone-700">
        <span
          className="inline-flex items-center gap-1"
          title={
            hasCartToPurchaseData && p.cartToPurchaseRate > 100
              ? 'Above 100% means purchases happened without an add-to-cart event.'
              : undefined
          }
        >
          {formatRate(p.cartToPurchaseRate, hasCartToPurchaseData)}
          {hasCartToPurchaseData && p.cartToPurchaseRate > 100 && <Info size={11} className="text-amber-600" />}
        </span>
      </td>
    </>
  );
};

/** Product-level table: used inside an expanded category and for the "All products" view */
const ProductsTable: React.FC<{ products: ProductAnalyticsItem[]; showCategory?: boolean }> = ({
  products,
  showCategory = false,
}) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left text-xs font-sans border-collapse">
      <thead>
        <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
          <th className="p-4 sticky left-0 bg-stone-50 z-10">Product Name</th>
          {showCategory && <th className="p-4">Category</th>}
          <th className="p-4">Units Sold</th>
          <th className="p-4 text-right">Gross Revenue</th>
          <th className="p-4 text-right">Views</th>
          <th className="p-4 text-right">Add to Cart</th>
          <th className="p-4 text-right">Purchases</th>
          <th className="p-4 text-right">Conversion Rate</th>
          <th className="p-4 text-right">Cart to Purchase Rate</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100 bg-white">
        {products.map(p => (
          <tr key={p.productId} className="hover:bg-stone-50/70 transition-colors">
            <td className="p-4 font-medium text-stone-900 sticky left-0 bg-white">{p.name}</td>
            {showCategory && <td className="p-4 text-stone-600">{p.categoryName}</td>}
            <MetricCells item={p} />
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const AdminAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'funnel' | 'meta'>('sales');

  // ── Sales summary (GET /admin/analytics/sales) ───────────────────────────────
  const [salesAnalytics, setSalesAnalytics] = useState<SalesAnalytics | null>(null);
  const [isSalesLoading, setIsSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [isSalesLoaded, setIsSalesLoaded] = useState(false);

  const fetchSales = useCallback(async () => {
    setIsSalesLoading(true);
    setSalesError(null);
    try {
      setSalesAnalytics(await getSalesAnalytics());
      setIsSalesLoaded(true);
    } catch (err) {
      setSalesError(analyticsErrorMessage(err, 'Failed to load sales analytics'));
    } finally {
      setIsSalesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'sales' && !isSalesLoaded) fetchSales();
  }, [activeTab, isSalesLoaded, fetchSales]);

  // ── Category Sales table (GET /admin/analytics/products) ──────────────────────
  // data.products is a flat product list; each product carries categoryId /
  // categoryName and is grouped into category rows on the client.
  // Server supports page/limit/rankBy (no search param): server pagination +
  // sort where rankBy covers it, client-side search/filter/purchases-sort.
  const [salesViewMode, setSalesViewMode] = useState<'categories' | 'allProducts'>('categories');
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [productsSearchInput, setProductsSearchInput] = useState('');
  const [productsSearch, setProductsSearch] = useState('');
  const [productsSort, setProductsSort] = useState<ProductsSort>(DEFAULT_PRODUCTS_SORT);
  const [productsFilter, setProductsFilter] = useState<ProductsFilter>(DEFAULT_PRODUCTS_FILTER);
  const [productsPage, setProductsPage] = useState(1);
  const [productsLimit, setProductsLimit] = useState(DEFAULT_PRODUCTS_LIMIT);

  const [productsItems, setProductsItems] = useState<ProductAnalyticsItem[]>([]);
  const [productsPagination, setProductsPagination] = useState<NonNullable<ProductAnalyticsResponse['pagination']> | null>(null);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isProductsLoaded, setIsProductsLoaded] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Debounce the search box before it resets to page 1 (nothing is sent to the
  // server for it — it's applied to the already-loaded page, see below)
  useEffect(() => {
    const t = setTimeout(() => {
      setProductsSearch(productsSearchInput.trim());
      setProductsPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [productsSearchInput]);

  const fetchProducts = useCallback(
    (signal?: AbortSignal) => {
      setIsProductsLoading(true);
      setProductsError(null);
      getProductAnalytics({ page: productsPage, limit: productsLimit, rankBy: RANK_BY_MAP[productsSort] }, signal)
        .then(result => {
          setProductsItems(result.products);
          setProductsPagination(result.pagination ?? null);
          setIsProductsLoaded(true);
        })
        .catch(err => {
          if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
          setProductsError(analyticsErrorMessage(err, 'Failed to load product analytics'));
        })
        .finally(() => {
          if (!signal?.aborted) setIsProductsLoading(false);
        });
    },
    [productsPage, productsLimit, productsSort]
  );

  useEffect(() => {
    if (activeTab !== 'sales') return;
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [activeTab, fetchProducts]);

  // Collapse any open category drilldown whenever the loaded page changes underneath it
  useEffect(() => {
    setExpandedCategoryId(null);
  }, [productsItems]);

  // rankBy covers revenue/unitsSold/views/conversion server-side already; only
  // 'purchases' needs a client-side sort. Search/filter are always client-side.
  const displayedProducts = useMemo(() => {
    let list = productsSort === 'purchases' ? sortProducts(productsItems, 'purchases') : productsItems;
    if (productsSearch) {
      const q = productsSearch.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q));
    }
    if (productsFilter !== 'all') {
      list = list.filter(p => matchesProductsFilter(p, productsFilter));
    }
    return list;
  }, [productsItems, productsSort, productsSearch, productsFilter]);

  // Category rows built from the (searched / filtered) products — recomputed only when those change
  const categoryGroups = useMemo(
    () => groupProductsByCategory(displayedProducts, productsSort),
    [displayedProducts, productsSort]
  );

  const hasActiveProductsFilters =
    Boolean(productsSearch) || productsFilter !== DEFAULT_PRODUCTS_FILTER || productsSort !== DEFAULT_PRODUCTS_SORT;

  const clearProductsFilters = () => {
    setProductsSearchInput('');
    setProductsSearch('');
    setProductsSort(DEFAULT_PRODUCTS_SORT);
    setProductsFilter(DEFAULT_PRODUCTS_FILTER);
    setProductsPage(1);
  };

  const isClientSideNarrowed = Boolean(productsSearch) || productsFilter !== 'all';
  const showSearchingWithinPageNote = isClientSideNarrowed && (productsPagination?.totalPages ?? 1) > 1;

  const productsRangeStart =
    productsPagination && productsItems.length > 0 ? (productsPagination.page - 1) * productsPagination.limit + 1 : 0;
  const productsRangeEnd = productsRangeStart > 0 ? productsRangeStart + productsItems.length - 1 : 0;

  const totalSales = salesAnalytics?.summary.grossSales ?? 0;
  const netSales = salesAnalytics?.summary.netRevenue ?? 0;
  const avgOrderValue = salesAnalytics?.summary.averageOrderValue ?? 0;
  const paidOrdersCount = salesAnalytics?.summary.paidOrdersCount ?? 0;

  // ── Conversion Funnel (GET /admin/analytics/funnel) ──────────────────────────
  const [funnelAnalytics, setFunnelAnalytics] = useState<FunnelAnalytics | null>(null);
  const [isFunnelLoading, setIsFunnelLoading] = useState(false);
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const [isFunnelLoaded, setIsFunnelLoaded] = useState(false);

  const fetchFunnel = useCallback(async () => {
    setIsFunnelLoading(true);
    setFunnelError(null);
    try {
      setFunnelAnalytics(await getFunnelAnalytics());
      setIsFunnelLoaded(true);
    } catch (err) {
      setFunnelError(analyticsErrorMessage(err, 'Failed to load the conversion funnel'));
    } finally {
      setIsFunnelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'funnel' && !isFunnelLoaded) fetchFunnel();
  }, [activeTab, isFunnelLoaded, fetchFunnel]);

  // ── Web & Meta Tracking (GET /admin/analytics/tracking-status) ───────────────
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus | null>(null);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [isMetaLoaded, setIsMetaLoaded] = useState(false);

  const fetchTrackingStatus = useCallback(async () => {
    setIsMetaLoading(true);
    setMetaError(null);
    try {
      const status = await getTrackingStatus();
      setTrackingStatus(status);
      setIsMetaLoaded(true);
    } catch (err) {
      setMetaError(analyticsErrorMessage(err, 'Failed to load tracking status'));
    } finally {
      setIsMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'meta' && !isMetaLoaded) fetchTrackingStatus();
  }, [activeTab, isMetaLoaded, fetchTrackingStatus]);

  const handleRefresh = () => {
    if (activeTab === 'sales') {
      fetchSales();
      fetchProducts();
    } else if (activeTab === 'funnel') fetchFunnel();
    else fetchTrackingStatus();
  };
  const isActiveTabLoading =
    activeTab === 'sales'
      ? isSalesLoading || isProductsLoading
      : activeTab === 'funnel'
        ? isFunnelLoading
        : isMetaLoading;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            INTELLIGENCE & PERFORMANCE
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Storefront Analytics & Conversion
          </h1>
          <p className="text-xs font-sans text-stone-500">
            Real-time revenue trajectories, 6-stage conversion funnels, and Meta CAPI dispatches.
          </p>
        </div>

        {/* View Switcher & Refresh */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={handleRefresh}
            disabled={isActiveTabLoading}
            className="p-2 border border-stone-200 hover:border-stone-400 rounded-xl bg-white text-stone-600 transition-colors shrink-0"
            title="Refresh Analytics"
          >
            <RefreshCw size={14} className={isActiveTabLoading ? 'animate-spin' : ''} />
          </button>
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans font-semibold max-w-full overflow-x-auto">
            {(
              [
                { id: 'sales', label: 'Sales & Products' },
                { id: 'funnel', label: 'Conversion Funnel' },
                { id: 'meta', label: 'Web & Meta Tracking' },
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${activeTab === tab.id
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-900'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 1: SALES & PRODUCTS */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          {salesError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
              <span>{salesError}</span>
              <button onClick={fetchSales} className="font-bold underline">Retry</button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Gross Sales</span>
              {isSalesLoading && !isSalesLoaded ? (
                <span className="inline-block h-8 w-24 bg-stone-100 rounded animate-pulse" />
              ) : (
                <p className="font-serif text-2xl font-bold text-[#561C08]">₹ {totalSales.toLocaleString('en-IN')}</p>
              )}
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Net Revenue</span>
              {isSalesLoading && !isSalesLoaded ? (
                <span className="inline-block h-8 w-24 bg-emerald-50 rounded animate-pulse" />
              ) : (
                <p className="font-serif text-2xl font-bold text-emerald-800">₹ {netSales.toLocaleString('en-IN')}</p>
              )}
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Average Order Value</span>
              {isSalesLoading && !isSalesLoaded ? (
                <span className="inline-block h-8 w-24 bg-stone-100 rounded animate-pulse" />
              ) : (
                <p className="font-serif text-2xl font-bold text-allura-darkBrown">₹ {avgOrderValue.toLocaleString('en-IN')}</p>
              )}
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Paid Orders Count</span>
              {isSalesLoading && !isSalesLoaded ? (
                <span className="inline-block h-8 w-16 bg-stone-100 rounded animate-pulse" />
              ) : (
                <p className="font-serif text-2xl font-bold text-[#561C08]">{paidOrdersCount}</p>
              )}
            </div>
          </div>

          {/* Category Sales Table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-200 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="font-serif text-lg font-normal text-stone-900">Category Sales</h3>
                {productsItems.length > 0 && (
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Live Sales Feed
                  </span>
                )}
              </div>

              {/* Categories | All products toggle */}
              <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans font-semibold">
                {(
                  [
                    { id: 'categories', label: 'Categories' },
                    { id: 'allProducts', label: 'All products' },
                  ] as const
                ).map(view => (
                  <button
                    key={view.id}
                    onClick={() => setSalesViewMode(view.id)}
                    className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                      salesViewMode === view.id ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-900'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="px-4 pt-3 text-[10px] font-sans text-stone-400 italic">Revenue excludes shipping and tax.</p>

            {/* Toolbar: search, sort, filter, page size, clear (shared by both views) */}
            <div className="p-4 border-b border-stone-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-sans">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search product or category…"
                  value={productsSearchInput}
                  onChange={e => setProductsSearchInput(e.target.value)}
                  className="w-full pl-8 pr-8 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800"
                />
                {productsSearchInput && (
                  <button
                    type="button"
                    onClick={() => setProductsSearchInput('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <select
                value={productsSort}
                onChange={e => {
                  setProductsSort(e.target.value as ProductsSort);
                  setProductsPage(1);
                }}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
              >
                {PRODUCTS_SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={productsFilter}
                onChange={e => {
                  setProductsFilter(e.target.value as ProductsFilter);
                  setProductsPage(1);
                }}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
              >
                {PRODUCTS_FILTER_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <select
                  value={productsLimit}
                  onChange={e => {
                    setProductsLimit(Number(e.target.value));
                    setProductsPage(1);
                  }}
                  className="flex-1 p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                >
                  {[10, 20, 50].map(n => (
                    <option key={n} value={n}>{n} / page</option>
                  ))}
                </select>
                {hasActiveProductsFilters && (
                  <button
                    type="button"
                    onClick={clearProductsFilters}
                    className="px-3 py-2.5 border border-stone-200 rounded-xl text-stone-600 hover:border-stone-400 whitespace-nowrap"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Summary line */}
            <div className="px-4 pt-3 text-[11px] font-sans text-stone-500 flex flex-wrap items-center gap-x-2 gap-y-1">
              {isClientSideNarrowed ? (
                <span>
                  Showing {displayedProducts.length} of {productsItems.length} products on this page
                </span>
              ) : (
                <span>
                  Showing {productsRangeStart}–{productsRangeEnd} of {productsPagination?.total ?? productsItems.length} products
                </span>
              )}
              {salesViewMode === 'categories' && displayedProducts.length > 0 && (
                <span>
                  · {categoryGroups.length} categor{categoryGroups.length === 1 ? 'y' : 'ies'}
                </span>
              )}
              {showSearchingWithinPageNote && (
                <span className="italic text-stone-400">Searching within this page</span>
              )}
              {salesViewMode === 'categories' && (productsPagination?.totalPages ?? 1) > 1 && (
                <span className="italic text-stone-400">Category totals cover the products on this page</span>
              )}
            </div>

            {productsError && (
              <div className="m-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
                <span>{productsError}</span>
                <button onClick={() => fetchProducts()} className="font-bold underline">Retry</button>
              </div>
            )}

            {salesViewMode === 'allProducts' ? (
              isProductsLoading && !isProductsLoaded ? (
                <div className="p-10 text-center text-stone-400">
                  <Loader2 size={20} className="animate-spin inline-block" />
                </div>
              ) : productsError && productsItems.length === 0 ? null : productsItems.length === 0 ? (
                <div className="p-10 text-center text-stone-400 text-xs font-sans">No product data available.</div>
              ) : displayedProducts.length === 0 ? (
                <div className="p-10 text-center text-stone-400 text-xs font-sans flex flex-col items-center gap-3">
                  <span>No products or categories match your search.</span>
                  <button
                    onClick={clearProductsFilters}
                    className="px-3 py-1.5 border border-stone-200 rounded-xl text-stone-600 hover:border-stone-400"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className={`mt-3 transition-opacity ${isProductsLoading ? 'opacity-50' : ''}`}>
                  <ProductsTable products={displayedProducts} showCategory />
                </div>
              )
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                    <th className="p-4 sticky left-0 bg-stone-50 z-10">Category</th>
                    <th className="p-4">Units Sold</th>
                    <th className="p-4 text-right">Gross Revenue</th>
                    <th className="p-4 text-right">Views</th>
                    <th className="p-4 text-right">Add to Cart</th>
                    <th className="p-4 text-right">Purchases</th>
                    <th className="p-4 text-right">View → Purchase %</th>
                    <th className="p-4 text-right">
                      <span
                        className="inline-flex items-center gap-1 justify-end w-full"
                        title="Above 100% means purchases happened without an add-to-cart event."
                      >
                        Cart → Purchase %
                        <Info size={11} className="text-stone-400" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y divide-stone-100 transition-opacity ${
                    isProductsLoading && isProductsLoaded ? 'opacity-50' : ''
                  }`}
                >
                  {isProductsLoading && !isProductsLoaded ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-stone-400">
                        <Loader2 size={20} className="animate-spin inline-block" />
                      </td>
                    </tr>
                  ) : !productsError && productsItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-stone-400">No product data available.</td>
                    </tr>
                  ) : !productsError && displayedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-stone-400">
                        <div className="flex flex-col items-center gap-3">
                          <span>No products or categories match your search.</span>
                          <button
                            onClick={clearProductsFilters}
                            className="px-3 py-1.5 border border-stone-200 rounded-xl text-stone-600 hover:border-stone-400"
                          >
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    categoryGroups.map(group => {
                      const isExpanded = expandedCategoryId === group.categoryId;
                      return (
                        <React.Fragment key={group.categoryId}>
                          <tr className="hover:bg-stone-50/70 transition-colors">
                            <td className="p-4 font-serif text-sm font-medium text-stone-900 sticky left-0 bg-white hover:bg-stone-50/70">
                              <button
                                type="button"
                                onClick={() => setExpandedCategoryId(isExpanded ? null : group.categoryId)}
                                className="flex items-center gap-1.5 text-left"
                                aria-expanded={isExpanded}
                                aria-label={isExpanded ? 'Collapse category' : 'Expand category'}
                              >
                                {isExpanded ? <ChevronUp size={13} className="text-stone-400 shrink-0" /> : <ChevronDown size={13} className="text-stone-400 shrink-0" />}
                                <span>{group.categoryName}</span>
                                <span className="font-sans text-[10px] font-normal text-stone-400">
                                  ({group.products.length} product{group.products.length === 1 ? '' : 's'})
                                </span>
                              </button>
                            </td>
                            <MetricCells item={group.summary} />
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="p-0 bg-stone-50/70 border-b border-stone-100">
                                <div className="p-4 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-900 text-white text-[11px] font-sans font-semibold">
                                      Category: {group.categoryName}
                                      <button
                                        type="button"
                                        onClick={() => setExpandedCategoryId(null)}
                                        aria-label="Close category"
                                        className="hover:text-stone-300"
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  </div>
                                  {group.products.length === 0 ? (
                                    <div className="p-5 text-center text-xs font-sans text-stone-400 bg-white border border-stone-200 rounded-xl">
                                      No products in this category.
                                    </div>
                                  ) : (
                                    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                                      <ProductsTable products={group.products} />
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            )}

            {/* Pagination controls */}
            {productsPagination && productsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 text-xs font-sans text-stone-500">
                <span>Page {productsPagination.page} of {productsPagination.totalPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                    disabled={productsPage <= 1 || isProductsLoading}
                    className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: productsPagination.totalPages }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      onClick={() => setProductsPage(n)}
                      disabled={isProductsLoading}
                      className={`w-7 h-7 rounded-lg font-semibold ${
                        n === productsPage ? 'bg-[#561C08] text-white' : 'hover:bg-stone-100 text-stone-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    onClick={() => setProductsPage(p => Math.min(productsPagination.totalPages, p + 1))}
                    disabled={productsPage >= productsPagination.totalPages || isProductsLoading}
                    className="p-1.5 border border-stone-200 rounded-lg disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: WEB & META TRACKING */}
      {activeTab === 'meta' && (
        <div className="space-y-6">
          {metaError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
              <span>{metaError}</span>
              <button onClick={fetchTrackingStatus} className="font-bold underline">Retry</button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Meta CAPI Total</span>
              <p className="font-serif text-2xl font-bold text-[#561C08]">
                {/* Derived: the backend has no single "total" field, so this sums sent+pending+failed */}
                {(trackingStatus?.meta.serverEventsSent ?? 0) +
                  (trackingStatus?.meta.serverEventsPending ?? 0) +
                  (trackingStatus?.meta.serverEventsFailed ?? 0)}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Dispatched & Sent</span>
              <p className="font-serif text-2xl font-bold text-emerald-800">
                {trackingStatus?.meta.serverEventsSent ?? 0}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Pending Queue</span>
              <p className="font-serif text-2xl font-bold text-amber-700">
                {trackingStatus?.meta.serverEventsPending ?? 0}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Failed Dispatches</span>
              <p className="font-serif text-2xl font-bold text-rose-700">
                {trackingStatus?.meta.serverEventsFailed ?? 0}
              </p>
            </div>
          </div>

          {/* Web Analytics Event Breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif text-xl font-normal text-stone-900">Captured Storefront Events</h3>
                <p className="text-xs text-stone-500 font-sans">Server-side aggregated browser and CAPI interaction logs</p>
              </div>
              {(() => {
                const meta = trackingStatus?.meta;
                if (!meta || !meta.pixelConfigured || !meta.capiConfigured) {
                  return (
                    <span className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold bg-stone-100 px-2.5 py-1 rounded-full">
                      <Radio size={12} />
                      Not Configured
                    </span>
                  );
                }
                if (meta.serverEventsFailed > 0) {
                  return (
                    <span className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-full">
                      <Radio size={12} className="animate-pulse" />
                      Dispatch Issues
                    </span>
                  );
                }
                if (meta.serverEventsSent === 0 && meta.serverEventsPending === 0) {
                  return (
                    <span className="flex items-center gap-1.5 text-xs text-stone-500 font-semibold bg-stone-100 px-2.5 py-1 rounded-full">
                      <Radio size={12} />
                      Configured – No Events Sent Yet
                    </span>
                  );
                }
                return (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                    <Radio size={12} className="animate-pulse" />
                    Pixel & CAPI Synced
                  </span>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              {(
                [
                  { event: 'PageView', label: 'Page Visits', key: 'PAGE_VIEW' },
                  { event: 'ViewContent', label: 'Product Previews', key: 'VIEW_CONTENT' },
                  { event: 'AddToCart', label: 'Bags Added', key: 'ADD_TO_CART' },
                  { event: 'InitiateCheckout', label: 'Checkouts Begun', key: 'INITIATE_CHECKOUT' },
                ] as const
              ).map(item => (
                <div key={item.event} className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-400">{item.event}</span>
                  <p className="font-serif text-xl font-bold text-[#561C08]">
                    {isMetaLoading && !isMetaLoaded ? (
                      <span className="inline-block h-6 w-10 bg-stone-100 rounded animate-pulse" />
                    ) : (
                      (trackingStatus?.analyticsEventsByName[item.key] ?? 0).toLocaleString()
                    )}
                  </p>
                  <p className="text-[11px] text-stone-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONVERSION FUNNEL */}
      {activeTab === 'funnel' && (
        <div className="bg-white border border-stone-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="font-serif text-2xl font-normal text-stone-900">Full Storefront Conversion Funnel</h3>
            <p className="text-xs text-stone-500 font-sans">
              Dropoff diagnostics from unique visitor landing through to completed Razorpay checkout.
            </p>
          </div>

          {funnelError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-sans text-rose-800 flex items-center justify-between">
              <span>{funnelError}</span>
              <button onClick={fetchFunnel} className="font-bold underline">Retry</button>
            </div>
          )}

          {isFunnelLoading && !isFunnelLoaded ? (
            <div className="flex items-center justify-center py-16 text-stone-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : !funnelAnalytics || funnelAnalytics.stages.length === 0 ? (
            !funnelError && <p className="text-center text-stone-400 py-16 text-xs font-sans">No funnel activity in this period.</p>
          ) : (
            <ConversionFunnelChart data={funnelAnalytics} />
          )}
        </div>
      )}
    </div>
  );
};
