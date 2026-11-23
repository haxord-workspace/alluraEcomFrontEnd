import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { usePermissions } from '../../hooks/usePermissions';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  getDashboardOverview,
  getDashboardSales,
  getDashboardOrders,
  getDashboardInventory,
  getDashboardMarketing,
  getDashboardSystemHealth,
  type OverviewMetrics,
  type SalesAnalyticsResponse,
  type OrdersSummaryResponse,
  type InventoryAnalyticsResponse,
  type MarketingAnalyticsResponse,
  type SystemHealthResponse
} from '../../service/adminDashboard';

// The dashboard only reads from GET /admin/dashboard/* endpoints:
// overview, sales, orders, inventory, marketing and system-health.

// Placeholder block shown while a section is loading (same style as the other admin pages)
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-block align-middle bg-stone-200/80 rounded animate-pulse ${className}`} />
);

// Fixed heights so the loading bars don't jump around between renders
const CHART_SKELETON_HEIGHTS = [45, 70, 55, 85, 60, 75, 50];

const formatINR = (value: number) => `₹ ${Math.round(value || 0).toLocaleString('en-IN')}`;

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Request state for one dashboard endpoint */
type Section<T> = { data: T | null; loading: boolean; error: boolean };
const initialSection = <T,>(): Section<T> => ({ data: null, loading: true, error: false });

/** Loads one dashboard endpoint whenever `deps` change; stale responses are ignored */
const useDashboardSection = <T,>(load: () => Promise<T>, deps: React.DependencyList): Section<T> => {
  const [state, setState] = useState<Section<T>>(initialSection<T>);

  useEffect(() => {
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true, error: false }));
    load()
      .then(data => { if (!cancelled) setState({ data: data ?? null, loading: false, error: !data }); })
      .catch(err => {
        console.warn('Dashboard API failed:', err);
        if (!cancelled) setState({ data: null, loading: false, error: true });
      });
    return () => { cancelled = true; };
  }, deps); // `load` is rebuilt every render; `deps` decides when to refetch

  return state;
};

type TimeRange = '7D' | '30D' | '90D' | '1Y';

// Calculate start date based on timeRange
const getDateRange = (range: TimeRange) => {
  const end = new Date();
  const start = new Date();
  if (range === '7D') start.setDate(start.getDate() - 7);
  else if (range === '30D') start.setDate(start.getDate() - 30);
  else if (range === '90D') start.setDate(start.getDate() - 90);
  else if (range === '1Y') start.setFullYear(start.getFullYear() - 1);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
};

export const AdminDashboardPage: React.FC = () => {
  const { currentAdmin } = useAdmin();
  const { can } = usePermissions();
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');

  // Date-ranged sections
  const overview = useDashboardSection<OverviewMetrics>(
    () => getDashboardOverview(getDateRange(timeRange)),
    [timeRange]
  );
  const sales = useDashboardSection<SalesAnalyticsResponse>(
    () => getDashboardSales({ ...getDateRange(timeRange), interval: timeRange === '7D' ? 'day' : 'week' }),
    [timeRange]
  );
  const orders = useDashboardSection<OrdersSummaryResponse>(
    () => getDashboardOrders({ ...getDateRange(timeRange), page: 1, limit: 5 }),
    [timeRange]
  );

  // Point-in-time sections
  const inventory = useDashboardSection<InventoryAnalyticsResponse>(getDashboardInventory, []);
  const marketing = useDashboardSection<MarketingAnalyticsResponse>(getDashboardMarketing, []);
  const systemHealth = useDashboardSection<SystemHealthResponse>(getDashboardSystemHealth, []);

  const overviewData = overview.data;
  const salesData = sales.data;

  // Sales chart: real time series only (empty when the API failed or returned nothing)
  const salesSeries = salesData?.timeSeries ?? [];
  const chartItems = salesSeries.slice(-7).map(item => ({
    label: item.period.split('T')[0] || item.period,
    revenue: item.grossSales,
  }));
  const salesPeriodLabel = timeRange === '7D' ? 'Day' : 'Week';
  const peakPeriod = salesSeries.length > 0
    ? salesSeries.reduce((best, item) => (item.grossSales > best.grossSales ? item : best))
    : null;
  const averagePerPeriod = salesSeries.length > 0
    ? salesSeries.reduce((sum, item) => sum + item.grossSales, 0) / salesSeries.length
    : 0;

  const topProducts = (salesData?.topProducts ?? []).slice(0, 5);
  const recentOrders = orders.data?.recentOrders ?? [];
  const criticalStock = inventory.data?.criticalStockVariants ?? [];
  const abandoned = marketing.data?.abandonedCarts;

  const healthStatus = systemHealth.data?.status;

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
              OPERATIONS OVERVIEW
            </span>
            {/* System status from GET /admin/dashboard/system-health only */}
            {healthStatus && (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  healthStatus === 'HEALTHY'
                    ? 'bg-emerald-500'
                    : healthStatus === 'DEGRADED'
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`} />
                <span className={`text-[11px] font-semibold font-sans ${
                  healthStatus === 'HEALTHY'
                    ? 'text-emerald-700'
                    : healthStatus === 'DEGRADED'
                    ? 'text-amber-700'
                    : 'text-rose-700'
                }`}>
                  System {healthStatus}
                </span>
              </>
            )}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-stone-900 font-normal mt-1">
            Good Morning, {currentAdmin.name}
          </h1>
          <p className="text-xs font-sans text-stone-500 mt-0.5">
            Here is what is happening across your Perinthalmanna atelier and online orders today.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range switcher */}
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans font-semibold">
            {(['7D', '30D', '90D', '1Y'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {can('products_catalog', 'create') && (
            <Link
              to="/admin/products/new"
              className="px-4 py-2 bg-[#561C08] hover:bg-[#561C08]/90 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Add Product</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stats Grid — GET /admin/dashboard/overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Revenue */}
        <Link
          to="/admin/analytics"
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-stone-400 transition-colors space-y-2 block"
        >
          <div className="flex justify-between items-start text-stone-500">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Gross Revenue</span>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#561C08]">
            {overview.loading
              ? <Skeleton className="h-7 w-28" />
              : overviewData ? formatINR(overviewData.sales.grossSales) : '—'}
          </p>
          <p className="text-[11px] font-sans text-stone-400">
            {overview.loading
              ? <Skeleton className="h-3 w-20" />
              : `AOV: ${overviewData ? formatINR(overviewData.sales.averageOrderValue) : '—'}`}
          </p>
        </Link>

        {/* Orders */}
        <Link
          to="/admin/orders"
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-stone-400 transition-colors space-y-2 block"
        >
          <div className="flex justify-between items-start text-stone-500">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Total Orders</span>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#561C08]">
            {overview.loading
              ? <Skeleton className="h-7 w-16" />
              : overviewData?.orders.totalOrders ?? '—'}
          </p>
          <p className="text-[11px] font-sans text-amber-700 font-medium">
            {overview.loading
              ? <Skeleton className="h-3 w-28" />
              : `${overviewData?.orders.awaitingPayment ?? '—'} awaiting payment`}
          </p>
        </Link>

        {/* Customers */}
        <Link
          to="/admin/customers"
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-stone-400 transition-colors space-y-2 block"
        >
          <div className="flex justify-between items-start text-stone-500">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Total Customers</span>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#561C08]">
            {overview.loading
              ? <Skeleton className="h-7 w-16" />
              : overviewData?.customers.totalCustomers ?? '—'}
          </p>
          <p className="text-[11px] font-sans text-stone-400">
            {overview.loading
              ? <Skeleton className="h-3 w-24" />
              : `New this period: ${overviewData?.customers.newCustomersInPeriod ?? '—'}`}
          </p>
        </Link>

        {/* Products & Inventory */}
        <Link
          to="/admin/inventory"
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-stone-400 transition-colors space-y-2 block"
        >
          <div className="flex justify-between items-start text-stone-500">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Products</span>
            <span className="text-stone-400 text-xs font-mono">
              {overview.loading
                ? <Skeleton className="h-3 w-16" />
                : `${overviewData?.catalog.totalVariants ?? '—'} Variants`}
            </span>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#561C08]">
            {overview.loading
              ? <Skeleton className="h-7 w-16" />
              : overviewData?.catalog.totalProducts ?? '—'}
          </p>
          <p className="text-[11px] font-sans text-rose-700 font-medium">
            {overview.loading
              ? <Skeleton className="h-3 w-24" />
              : `${overviewData?.catalog.lowStockVariants ?? '—'} low · ${overviewData?.catalog.outOfStockVariants ?? '—'} out of stock`}
          </p>
        </Link>
      </div>

      {/* Sales Chart & Top Products — GET /admin/dashboard/sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Sales Trend (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center gap-3">
            <div>
              <h3 className="font-serif text-xl font-normal text-stone-900">Revenue Trend</h3>
              <p className="text-xs font-sans text-stone-500">
                {sales.loading
                  ? <Skeleton className="h-3 w-48" />
                  : salesData
                  ? `Gross ${formatINR(salesData.totals.grossSales)} · Net ${formatINR(salesData.totals.netSales)} · ${salesData.totals.paidOrderCount} paid orders`
                  : 'Sales data unavailable'}
              </p>
            </div>
            <span className="text-xs font-sans font-bold text-allura-goldDark whitespace-nowrap">{timeRange} Window</span>
          </div>

          {/* Bar chart */}
          <div className="h-48 flex items-end justify-between gap-3 pt-4 px-2 border-b border-stone-100">
            {sales.loading ? (
              CHART_SKELETON_HEIGHTS.map((h, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end" aria-hidden="true">
                  <div className="w-full max-w-[40px] bg-stone-200/80 rounded-t-lg animate-pulse" style={{ height: `${h}%` }} />
                  <div className="h-3 w-10 bg-stone-200/70 rounded animate-pulse" />
                </div>
              ))
            ) : chartItems.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs font-sans text-stone-400">
                {salesData ? 'No sales data for this period.' : 'Could not load sales data.'}
              </div>
            ) : (() => {
              const maxVal = Math.max(1, ...chartItems.map(d => d.revenue));

              return chartItems.map((day, idx) => {
                const heightPct = Math.min(100, Math.max(8, Math.round((day.revenue / maxVal) * 100)));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-sans font-bold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded whitespace-nowrap">
                      ₹{Math.round(day.revenue / 1000)}k
                    </div>
                    <div
                      className="w-full max-w-[40px] bg-[#561C08] group-hover:bg-allura-gold transition-colors rounded-t-lg"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[10px] font-sans text-stone-500 truncate max-w-[48px]">{day.label}</span>
                  </div>
                );
              });
            })()}
          </div>

          {(sales.loading || peakPeriod) && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-sans text-stone-500 pt-2">
              {sales.loading ? (
                <>
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-28" />
                </>
              ) : peakPeriod && (
                <>
                  <span>
                    Peak {salesPeriodLabel}:{' '}
                    <strong>
                      {peakPeriod.period.split('T')[0] || peakPeriod.period} ({formatINR(peakPeriod.grossSales)} / {peakPeriod.paidOrderCount} Orders)
                    </strong>
                  </span>
                  <span>Average per {salesPeriodLabel}: <strong>{formatINR(averagePerPeriod)}</strong></span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Top Products (1 Col) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-serif text-xl font-normal text-stone-900">Top Products</h3>

          <div className="space-y-3">
            {sales.loading && Array.from({ length: 4 }).map((_, i) => (
              <div key={`skeleton-${i}`} aria-hidden="true" className="flex items-center justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="h-3 w-32 bg-stone-200/80 rounded animate-pulse" />
                  <div className="h-2.5 w-16 bg-stone-200/70 rounded animate-pulse" />
                </div>
                <div className="h-3.5 w-14 bg-stone-200/70 rounded animate-pulse" />
              </div>
            ))}
            {!sales.loading && sales.error && (
              <p className="text-xs text-stone-400 font-sans">Could not load top products.</p>
            )}
            {!sales.loading && !sales.error && topProducts.length === 0 && (
              <p className="text-xs text-stone-400 font-sans">No product sales in this period.</p>
            )}
            {!sales.loading && topProducts.map((product, idx) => (
              <div key={product.productId || idx} className="flex items-center justify-between gap-3 text-xs font-sans">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 shrink-0 rounded-full bg-stone-100 text-stone-500 text-[10px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900 truncate">{product.name || 'Product'}</p>
                    <p className="text-[10px] text-stone-500">{product.unitsSold} sold</p>
                  </div>
                </div>
                <span className="font-bold text-[#561C08] whitespace-nowrap">{formatINR(product.totalRevenue)}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Operational Highlights: Recent Orders, Critical Stock, Abandoned Carts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Recent Orders (2 Cols) — GET /admin/dashboard/orders */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-serif text-xl font-normal text-stone-900">Recent Orders</h3>
              {orders.data?.attentionRequired && (
                <p className="text-xs text-amber-700 font-sans font-medium">
                  {orders.data.attentionRequired.pendingPayment} pending payment · {orders.data.attentionRequired.pendingProcessing} to process
                </p>
              )}
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-sans font-bold text-stone-900 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="text-stone-400 uppercase tracking-wider text-[10px] pb-2">
                  <th className="py-2">Order</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Payment</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} aria-hidden="true">
                    <td className="py-3"><Skeleton className="h-3.5 w-24" /><br /><Skeleton className="h-2.5 w-16 mt-1.5" /></td>
                    <td className="py-3"><Skeleton className="h-3.5 w-16" /></td>
                    <td className="py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="py-3"><Skeleton className="h-5 w-16" /></td>
                    <td className="py-3 text-right"><Skeleton className="h-3.5 w-12" /></td>
                  </tr>
                ))}
                {!orders.loading && orders.error && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-400">Could not load recent orders.</td>
                  </tr>
                )}
                {!orders.loading && !orders.error && recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-400">No orders in this period.</td>
                  </tr>
                )}
                {!orders.loading && recentOrders.map(order => (
                  <tr key={order._id} className="hover:bg-stone-50/60">
                    <td className="py-3">
                      <p className="font-bold text-stone-900 font-serif">{order.orderNumber}</p>
                      <p className="text-[10px] text-stone-400">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="py-3 font-bold text-[#561C08]">
                      {formatINR(order.pricing?.totalPayable ?? 0)}
                    </td>
                    <td className="py-3">
                      {order.status ? <StatusBadge status={order.status} size="sm" /> : '—'}
                    </td>
                    <td className="py-3">
                      {order.paymentStatus ? <StatusBadge status={order.paymentStatus} size="sm" /> : '—'}
                    </td>
                    <td className="py-3 text-right">
                      {can('order_processing', 'view') ? (
                        <Link
                          to={`/admin/orders/${order._id}`}
                          className="text-xs font-bold text-allura-goldDark hover:underline"
                        >
                          Manage
                        </Link>
                      ) : (
                        <span className="text-stone-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">

          {/* Critical Stock — GET /admin/dashboard/inventory */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                <span>Low Stock Items</span>
              </h3>
              {can('inventory_stock', 'edit') && (
                <Link to="/admin/inventory" className="text-xs text-stone-500 hover:underline">
                  Adjust
                </Link>
              )}
            </div>

            {inventory.data && (
              <p className="text-[11px] font-sans text-stone-500">
                {inventory.data.lowStockCount} low · {inventory.data.outOfStockCount} out of stock · {inventory.data.inStockCount} in stock
              </p>
            )}

            <div className="space-y-3">
              {inventory.loading && Array.from({ length: 3 }).map((_, i) => (
                <div key={`skeleton-${i}`} aria-hidden="true" className="flex items-center justify-between p-2.5 rounded-xl border border-stone-100">
                  <div className="space-y-1.5">
                    <div className="h-3 w-28 bg-stone-200/80 rounded animate-pulse" />
                    <div className="h-2.5 w-16 bg-stone-200/70 rounded animate-pulse" />
                  </div>
                  <div className="h-4 w-12 bg-stone-200/70 rounded animate-pulse" />
                </div>
              ))}
              {!inventory.loading && inventory.error && (
                <p className="text-xs text-stone-400 font-sans">Could not load inventory health.</p>
              )}
              {!inventory.loading && !inventory.error && criticalStock.length === 0 && (
                <p className="text-xs text-stone-400 font-sans">No low stock variants right now.</p>
              )}
              {!inventory.loading && criticalStock.slice(0, 3).map((item, idx) => (
                <div key={item._id || item.variantId || item.sku || idx} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs font-sans">
                  <div className="min-w-0">
                    <p className="font-medium text-stone-900 truncate">{item.productName || item.sku || 'Variant'}</p>
                    {item.sku && <p className="text-[10px] text-stone-500 font-mono truncate">SKU: {item.sku}</p>}
                  </div>
                  <span className="shrink-0 font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                    {item.quantityAvailable} left
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Abandoned Carts — GET /admin/dashboard/marketing */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl font-normal text-stone-900">Abandoned Carts</h3>
              {can('coupons_banners', 'view') && abandoned && (
                <Link to="/admin/marketing/abandoned-carts" className="text-xs text-stone-500 hover:underline">
                  View ({abandoned.total})
                </Link>
              )}
            </div>

            {marketing.loading ? (
              <div className="grid grid-cols-3 gap-2" aria-hidden="true">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-stone-200/70 animate-pulse" />
                ))}
              </div>
            ) : !abandoned ? (
              <p className="text-xs text-stone-400 font-sans">Could not load abandoned carts.</p>
            ) : abandoned.total === 0 ? (
              <p className="text-xs text-stone-500 font-sans">No abandoned bags right now.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center font-sans">
                <div className="rounded-xl bg-stone-50 border border-stone-100 py-2.5">
                  <p className="font-serif text-lg font-bold text-[#561C08]">{abandoned.pending}</p>
                  <p className="text-[10px] uppercase tracking-wider text-stone-500">Pending</p>
                </div>
                <div className="rounded-xl bg-stone-50 border border-stone-100 py-2.5">
                  <p className="font-serif text-lg font-bold text-[#561C08]">{abandoned.recovered}</p>
                  <p className="text-[10px] uppercase tracking-wider text-stone-500">Recovered</p>
                </div>
                <div className="rounded-xl bg-stone-50 border border-stone-100 py-2.5">
                  <p className="font-serif text-lg font-bold text-[#561C08]">{Math.round(abandoned.recoveryRate ?? 0)}%</p>
                  <p className="text-[10px] uppercase tracking-wider text-stone-500">Rate</p>
                </div>
              </div>
            )}

            {can('coupons_banners', 'view') && (
              <Link
                to="/admin/marketing/abandoned-carts"
                className="block text-center py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl text-xs font-sans font-bold uppercase transition-colors"
              >
                Open Recovery Hub
              </Link>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
