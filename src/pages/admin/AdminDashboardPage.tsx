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
import { getLowStockInventory } from '../../service/adminInventory';
import type { InventoryRecord } from '../../service/adminInventory';
import { getAdminOrders } from '../../service/orders';
import { getAdminAbandonedCarts } from '../../service/abandonedCarts';
import {
  getDashboardOverview,
  getDashboardSales,
  getDashboardSystemHealth,
  type OverviewMetrics,
  type SalesAnalyticsResponse,
  type SystemHealthResponse
} from '../../service/adminDashboard';
import type { Order } from '../../types';

// Placeholder block shown while a section is loading (same style as the other admin pages)
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-block align-middle bg-stone-200/80 rounded animate-pulse ${className}`} />
);

// Fixed heights so the loading bars don't jump around between renders
const CHART_SKELETON_HEIGHTS = [45, 70, 55, 85, 60, 75, 50];

export const AdminDashboardPage: React.FC = () => {
  const { currentAdmin } = useAdmin();
  const { can } = usePermissions();
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  const [overviewData, setOverviewData] = useState<OverviewMetrics | null>(null);
  const [salesData, setSalesData] = useState<SalesAnalyticsResponse | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [isSalesLoading, setIsSalesLoading] = useState(true);

  const [lowStockItems, setLowStockItems] = useState<InventoryRecord[]>([]);
  const [isLowStockLoading, setIsLowStockLoading] = useState(true);
  const [lowStockError, setLowStockError] = useState(false);

  // Calculate start date based on timeRange
  const getDateRange = (range: '7D' | '30D' | '90D' | '1Y') => {
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

  useEffect(() => {
    const { startDate, endDate } = getDateRange(timeRange);
    // Ignore responses from a previous time range if the admin switches quickly
    let cancelled = false;

    getDashboardOverview({ startDate, endDate })
      .then(data => { if (!cancelled) setOverviewData(data); })
      .catch(err => {
        console.warn('Could not load dashboard overview API:', err);
        if (!cancelled) setOverviewData(null);
      })
      .finally(() => { if (!cancelled) setIsOverviewLoading(false); });

    getDashboardSales({ startDate, endDate, interval: timeRange === '7D' ? 'day' : 'week' })
      .then(data => { if (!cancelled) setSalesData(data); })
      .catch(err => {
        console.warn('Could not load sales analytics API:', err);
        if (!cancelled) setSalesData(null);
      })
      .finally(() => { if (!cancelled) setIsSalesLoading(false); });

    return () => { cancelled = true; };
  }, [timeRange]);

  useEffect(() => {
    getDashboardSystemHealth()
      .then(setSystemHealth)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getLowStockInventory()
      .then(setLowStockItems)
      .catch(err => {
        console.error('Failed to load low stock inventory:', err);
        setLowStockError(true);
      })
      .finally(() => setIsLowStockLoading(false));
  }, []);

  // Recent orders + counts from the orders API
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  // Abandoned carts: count + value of the most recent ones
  const [abandonedTotal, setAbandonedTotal] = useState(0);
  const [abandonedValue, setAbandonedValue] = useState(0);
  const [isAbandonedLoading, setIsAbandonedLoading] = useState(true);
  const [abandonedError, setAbandonedError] = useState(false);
  useEffect(() => {
    getAdminAbandonedCarts({ page: 1, limit: 50 })
      .then(result => {
        setAbandonedTotal(result.total);
        setAbandonedValue(result.carts.filter(c => !/RECOVER|SUPPRESS|CONVERT|EXPIRE/i.test(c.status)).reduce((sum, c) => sum + c.cartValue, 0));
      })
      .catch(() => setAbandonedError(true))
      .finally(() => setIsAbandonedLoading(false));
  }, []);

  useEffect(() => {
    getAdminOrders({ page: 1, limit: 5 })
      .then(result => {
        setRecentOrders(result.orders);
        setTotalOrders(result.total);
      })
      .catch(err => {
        console.error('Failed to load recent orders:', err);
        setOrdersError(true);
      })
      .finally(() => setIsOrdersLoading(false));
    getAdminOrders({ page: 1, limit: 1, status: 'PENDING' })
      .then(result => setPendingCount(result.total))
      .catch(() => {});
  }, []);

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

  // Total orders falls back to the orders list API when the overview API is unavailable
  const isOrdersKpiLoading = isOverviewLoading || (!overviewData && isOrdersLoading);

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
              OPERATIONS OVERVIEW
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${
              systemHealth?.status === 'HEALTHY'
                ? 'bg-emerald-500'
                : systemHealth?.status === 'DEGRADED'
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`} />
            <span className="text-[11px] text-emerald-700 font-semibold font-sans">
              {systemHealth ? `System ${systemHealth.status} · Live Synced` : 'Live Storefront Synced'}
            </span>
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
                onClick={() => {
                  if (range !== timeRange) {
                    setIsOverviewLoading(true);
                    setIsSalesLoading(true);
                  }
                  setTimeRange(range);
                }}
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

      {/* KPI Stats Grid */}
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
            {isOverviewLoading
              ? <Skeleton className="h-7 w-28" />
              : overviewData ? `₹ ${overviewData.sales.grossSales.toLocaleString('en-IN')}` : '—'}
          </p>
          <p className="text-[11px] font-sans text-stone-400">
            {isOverviewLoading
              ? <Skeleton className="h-3 w-20" />
              : `AOV: ${overviewData ? `₹${overviewData.sales.averageOrderValue.toLocaleString('en-IN')}` : '—'}`}
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
            {isOrdersKpiLoading
              ? <Skeleton className="h-7 w-16" />
              : overviewData?.orders.totalOrders ?? (ordersError ? '—' : totalOrders)}
          </p>
          <p className="text-[11px] font-sans text-amber-700 font-medium">
            {isOrdersKpiLoading
              ? <Skeleton className="h-3 w-28" />
              : `${overviewData?.orders.awaitingPayment ?? pendingCount} awaiting confirmation`}
          </p>
        </Link>

        {/* Customers */}
        <Link
          to="/admin/customers"
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-stone-400 transition-colors space-y-2 block"
        >
          <div className="flex justify-between items-start text-stone-500">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Active Customers</span>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#561C08]">
            {isOverviewLoading
              ? <Skeleton className="h-7 w-16" />
              : overviewData?.customers.totalCustomers ?? '—'}
          </p>
          <p className="text-[11px] font-sans text-stone-400">
            {isOverviewLoading
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
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Atelier Products</span>
            <span className="text-stone-400 text-xs font-mono">
              {isOverviewLoading
                ? <Skeleton className="h-3 w-16" />
                : `${overviewData?.catalog.totalVariants ?? '—'} Variants`}
            </span>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-[#561C08]">
            {isOverviewLoading
              ? <Skeleton className="h-7 w-16" />
              : overviewData?.catalog.totalProducts ?? '—'}
          </p>
          <p className="text-[11px] font-sans text-rose-700 font-medium">
            {isOverviewLoading || (!overviewData && isLowStockLoading)
              ? <Skeleton className="h-3 w-24" />
              : `${overviewData?.catalog.lowStockVariants ?? (lowStockError ? '—' : lowStockItems.length)} items low on stock`}
          </p>
        </Link>
      </div>

      {/* Sales Overview Chart & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Trend (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-serif text-xl font-normal text-stone-900">Revenue & Order Trajectory</h3>
              <p className="text-xs font-sans text-stone-500">
                {salesData ? `Gross ₹${salesData.totals.grossSales.toLocaleString('en-IN')} (Net ₹${salesData.totals.netSales.toLocaleString('en-IN')})` : 'Gross online sales and dispatch volume'}
              </p>
            </div>
            <span className="text-xs font-sans font-bold text-allura-goldDark">{timeRange} Window</span>
          </div>

          {/* Bar chart */}
          <div className="h-48 flex items-end justify-between gap-3 pt-4 px-2 border-b border-stone-100">
            {isSalesLoading ? (
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

          <div className="flex items-center justify-between text-xs font-sans text-stone-500 pt-2">
            {isSalesLoading ? (
              <>
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-28" />
              </>
            ) : peakPeriod ? (
              <>
                <span>
                  Peak {salesPeriodLabel}:{' '}
                  <strong>
                    {peakPeriod.period.split('T')[0] || peakPeriod.period} (₹{Math.round(peakPeriod.grossSales).toLocaleString('en-IN')} / {peakPeriod.paidOrderCount} Orders)
                  </strong>
                </span>
                <span>Average per {salesPeriodLabel}: <strong>₹{Math.round(averagePerPeriod).toLocaleString('en-IN')}</strong></span>
              </>
            ) : (
              <span>Peak {salesPeriodLabel}: <strong>—</strong></span>
            )}
          </div>
        </div>

        {/* Conversion Funnel (1 Col) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-xl font-normal text-stone-900">Conversion Funnel</h3>
          </div>

          {/* The dashboard APIs don't provide funnel data yet, so no figures are shown here */}
          <div className="py-8 text-center text-xs font-sans text-stone-400">
            No funnel data available yet.
          </div>

          <Link
            to="/admin/analytics"
            className="block text-center text-xs font-sans font-bold text-allura-goldDark hover:underline pt-2"
          >
            View Complete Funnel Breakdown →
          </Link>
        </div>

      </div>

      {/* Operational Highlights: Recent Orders, Low Stock Alerts, Abandoned Carts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Recent Orders (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
            <div>
              <h3 className="font-serif text-xl font-normal text-stone-900">Recent Customer Orders</h3>
              <p className="text-xs text-stone-500 font-sans">Direct online atelier purchases</p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-sans font-bold text-stone-900 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="divide-y divide-stone-100 overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-xs font-sans border-collapse">
              <thead>
                <tr className="text-stone-400 uppercase tracking-wider text-[10px] pb-2">
                  <th className="py-2">Order</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Amount</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {isOrdersLoading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skeleton-${i}`} aria-hidden="true">
                    <td className="py-3"><Skeleton className="h-3.5 w-24" /><br /><Skeleton className="h-2.5 w-16 mt-1.5" /></td>
                    <td className="py-3"><Skeleton className="h-3.5 w-28" /><br /><Skeleton className="h-2.5 w-14 mt-1.5" /></td>
                    <td className="py-3"><Skeleton className="h-3.5 w-16" /></td>
                    <td className="py-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="py-3 text-right"><Skeleton className="h-3.5 w-12" /></td>
                  </tr>
                ))}
                {!isOrdersLoading && ordersError && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-400">Could not load recent orders.</td>
                  </tr>
                )}
                {!isOrdersLoading && !ordersError && recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-stone-400">No orders yet.</td>
                  </tr>
                )}
                {recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/60">
                    <td className="py-3">
                      <p className="font-bold text-stone-900 font-serif">{order.orderNumber}</p>
                      <p className="text-[10px] text-stone-400">{order.date}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-stone-800">{order.customer.name}</p>
                      <p className="text-[10px] text-stone-400">{order.shippingAddress.city}</p>
                    </td>
                    <td className="py-3 font-bold text-[#561C08]">
                      ₹ {order.total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={order.orderStatus} size="sm" />
                    </td>
                    <td className="py-3 text-right">
                      {can('order_processing', 'view') ? (
                        <Link
                          to={`/admin/orders/${order.id}`}
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

        {/* Low Stock & Action Alerts (1 Col) */}
        <div className="space-y-6">
          
          {/* Low Stock Card */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl font-normal text-stone-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                <span>Low Stock Atelier Items</span>
              </h3>
              {can('inventory_stock', 'edit') && (
                <Link to="/admin/inventory" className="text-xs text-stone-500 hover:underline">
                  Adjust
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {isLowStockLoading && Array.from({ length: 3 }).map((_, i) => (
                <div key={`skeleton-${i}`} aria-hidden="true" className="flex items-center justify-between p-2.5 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-11 rounded bg-stone-200/80 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-24 bg-stone-200/80 rounded animate-pulse" />
                      <div className="h-2.5 w-16 bg-stone-200/70 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-4 w-12 bg-stone-200/70 rounded animate-pulse" />
                </div>
              ))}
              {!isLowStockLoading && lowStockError && (
                <p className="text-xs text-stone-400 font-sans">Could not load low stock items.</p>
              )}
              {!isLowStockLoading && !lowStockError && lowStockItems.length === 0 && (
                <p className="text-xs text-stone-400 font-sans">No low stock variants right now.</p>
              )}
              {lowStockItems.slice(0, 3).map(item => (
                <div key={item.id || item.variantId} className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs font-sans">
                  <div className="flex items-center gap-2.5">
                    {item.image ? (
                      <img src={item.image} alt={item.productName || item.sku} className="w-9 h-11 object-cover rounded bg-stone-100" />
                    ) : (
                      <div className="w-9 h-11 rounded bg-stone-100" />
                    )}
                    <div>
                      <p className="font-medium text-stone-900 truncate max-w-[130px]">{item.productName || item.sku || 'Variant'}</p>
                      <p className="text-[10px] text-stone-500 font-mono">SKU: {item.sku || '—'}</p>
                    </div>
                  </div>
                  <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                    {item.quantityAvailable} left
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Abandoned Cart Quick Recovery */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl font-normal text-stone-900">Abandoned Carts</h3>
              {can('coupons_banners', 'view') && (
                <Link to="/admin/marketing/abandoned-carts" className="text-xs text-stone-500 hover:underline">
                  View ({isAbandonedLoading ? '…' : abandonedError ? '—' : abandonedTotal})
                </Link>
              )}
            </div>
            <p className="text-xs text-stone-500 font-sans">
              {isAbandonedLoading
                ? <><Skeleton className="h-3 w-full" /><br /><Skeleton className="h-3 w-2/3 mt-1.5" /></>
                : abandonedError
                ? 'Could not load abandoned carts.'
                : abandonedTotal === 0
                ? 'No abandoned bags right now.'
                : `₹ ${Math.round(abandonedValue).toLocaleString('en-IN')} in bags customers left behind, recoverable via WhatsApp & email reminders.`}
            </p>
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
