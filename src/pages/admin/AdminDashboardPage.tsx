import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowUpRight, 
  AlertTriangle, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { mockAnalyticsData } from '../../data/mockAnalytics';
import { StatusBadge } from '../../components/common/StatusBadge';

export const AdminDashboardPage: React.FC = () => {
  const { currentAdmin, orders, products, abandonedCarts } = useAdmin();
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  const { overview, salesChart, funnel } = mockAnalyticsData;

  const lowStockProducts = products.filter(p => (p.stockCount ?? 0) <= 6);
  const pendingOrders = orders.filter(o => o.orderStatus === 'Processing' || o.orderStatus === 'Pending');

  return (
    <div className="space-y-8 pb-12">
      {/* Header & Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
              OPERATIONS OVERVIEW
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-emerald-700 font-semibold font-sans">Live Storefront Synced</span>
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

          <Link
            to="/admin/products/new"
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Add Product</span>
          </Link>
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
            <div className="flex items-center text-emerald-700 text-xs font-semibold">
              <span>{overview.revenueGrowth}</span>
              <ArrowUpRight size={14} />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            ₹ {overview.revenue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] font-sans text-stone-400">AOV: ₹{overview.averageOrderValue.toLocaleString('en-IN')}</p>
        </Link>

        {/* Orders */}
        <Link
          to="/admin/orders"
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-stone-400 transition-colors space-y-2 block"
        >
          <div className="flex justify-between items-start text-stone-500">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Total Orders</span>
            <div className="flex items-center text-emerald-700 text-xs font-semibold">
              <span>{overview.ordersGrowth}</span>
              <ArrowUpRight size={14} />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            {orders.length}
          </p>
          <p className="text-[11px] font-sans text-amber-700 font-medium">{pendingOrders.length} pending dispatch</p>
        </Link>

        {/* Customers */}
        <Link
          to="/admin/customers"
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-stone-400 transition-colors space-y-2 block"
        >
          <div className="flex justify-between items-start text-stone-500">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Active Customers</span>
            <div className="flex items-center text-emerald-700 text-xs font-semibold">
              <span>{overview.customersGrowth}</span>
              <ArrowUpRight size={14} />
            </div>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            {overview.customers}
          </p>
          <p className="text-[11px] font-sans text-stone-400">Conversion Rate: {overview.conversionRate}%</p>
        </Link>

        {/* Products & Inventory */}
        <Link
          to="/admin/inventory"
          className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs hover:border-stone-400 transition-colors space-y-2 block"
        >
          <div className="flex justify-between items-start text-stone-500">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider">Atelier Products</span>
            <span className="text-stone-400 text-xs font-mono">{products.length} SKUs</span>
          </div>
          <p className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            {products.length}
          </p>
          <p className="text-[11px] font-sans text-rose-700 font-medium">{lowStockProducts.length} items low on stock</p>
        </Link>
      </div>

      {/* Sales Overview Chart & Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Trend (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-serif text-xl font-normal text-stone-900">Weekly Revenue & Order Trajectory</h3>
              <p className="text-xs font-sans text-stone-500">Gross online sales and dispatch volume</p>
            </div>
            <span className="text-xs font-sans font-bold text-allura-goldDark">Last 7 Days</span>
          </div>

          {/* Bar chart mockup */}
          <div className="h-48 flex items-end justify-between gap-3 pt-4 px-2 border-b border-stone-100">
            {salesChart.map((day, idx) => {
              const maxVal = 120000;
              const heightPct = Math.round((day.revenue / maxVal) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-sans font-bold text-stone-800 bg-stone-100 px-1.5 py-0.5 rounded">
                    ₹{Math.round(day.revenue / 1000)}k
                  </div>
                  <div
                    className="w-full max-w-[40px] bg-stone-900 group-hover:bg-allura-gold transition-colors rounded-t-lg"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[11px] font-sans text-stone-500">{day.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs font-sans text-stone-500 pt-2">
            <span>Peak Day: <strong>Saturday (₹1,12,000 / 16 Orders)</strong></span>
            <span>Average Daily: <strong>₹69,500</strong></span>
          </div>
        </div>

        {/* Conversion Funnel (1 Col) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-serif text-xl font-normal text-stone-900">Conversion Funnel</h3>
            <span className="text-xs font-bold text-emerald-800 font-sans">{overview.conversionRate}%</span>
          </div>

          <div className="space-y-3 pt-2">
            {funnel.map((stg, i) => (
              <div key={i} className="space-y-1 text-xs font-sans">
                <div className="flex justify-between text-stone-700">
                  <span className="font-medium">{stg.stage}</span>
                  <span className="font-mono font-bold text-stone-900">{stg.count.toLocaleString()}</span>
                </div>
                <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-800 rounded-full"
                    style={{ width: `${stg.percentage}%` }}
                  />
                </div>
              </div>
            ))}
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
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4">
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
            <table className="w-full text-left text-xs font-sans border-collapse">
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
                {orders.slice(0, 5).map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/60">
                    <td className="py-3">
                      <p className="font-bold text-stone-900 font-serif">{order.orderNumber}</p>
                      <p className="text-[10px] text-stone-400">{order.date}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-stone-800">{order.customer.name}</p>
                      <p className="text-[10px] text-stone-400">{order.shippingAddress.city}</p>
                    </td>
                    <td className="py-3 font-bold text-stone-900">
                      ₹ {order.total.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={order.orderStatus} size="sm" />
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="text-xs font-bold text-allura-goldDark hover:underline"
                      >
                        Manage
                      </Link>
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
              <Link to="/admin/inventory" className="text-xs text-stone-500 hover:underline">
                Adjust
              </Link>
            </div>

            <div className="space-y-3">
              {lowStockProducts.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 border border-rose-100 text-xs font-sans">
                  <div className="flex items-center gap-2.5">
                    <img src={p.images.primary} alt={p.name} className="w-9 h-11 object-cover rounded bg-stone-100" />
                    <div>
                      <p className="font-medium text-stone-900 truncate max-w-[130px]">{p.name}</p>
                      <p className="text-[10px] text-stone-500 font-mono">SKU: {p.sku}</p>
                    </div>
                  </div>
                  <span className="font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                    {p.stockCount} left
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Abandoned Cart Quick Recovery */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl font-normal text-stone-900">Abandoned Carts</h3>
              <Link to="/admin/marketing/abandoned-carts" className="text-xs text-stone-500 hover:underline">
                View ({abandonedCarts.length})
              </Link>
            </div>
            <p className="text-xs text-stone-500 font-sans">
              ₹ {overview.abandonedCartValue.toLocaleString('en-IN')} potential revenue recoverable via WhatsApp & Email reminders.
            </p>
            <Link
              to="/admin/marketing/abandoned-carts"
              className="block text-center py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 rounded-xl text-xs font-sans font-bold uppercase transition-colors"
            >
              Open Recovery Hub
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
};
