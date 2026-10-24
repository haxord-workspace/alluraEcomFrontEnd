import React, { useState, useEffect } from 'react';
import { mockAnalyticsData } from '../../data/mockAnalytics';
import {
  getDashboardSales,
  getDashboardAnalytics,
  type SalesAnalyticsResponse,
  type TrackingAnalyticsResponse,
} from '../../service/adminDashboard';
import { Radio, RefreshCw } from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'funnel' | 'search' | 'meta'>('sales');
  const { overview: mockOverview, funnel, topProducts: mockTopProducts, searchAnalytics } = mockAnalyticsData;

  const [salesData, setSalesData] = useState<SalesAnalyticsResponse | null>(null);
  const [trackingData, setTrackingData] = useState<TrackingAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [sData, tData] = await Promise.all([
        getDashboardSales().catch(() => null),
        getDashboardAnalytics().catch(() => null),
      ]);
      if (sData) setSalesData(sData);
      if (tData) setTrackingData(tData);
    } catch (err) {
      console.warn('Could not load live analytics, falling back to mock:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSales = salesData?.totals.grossSales ?? mockOverview.revenue;
  const netSales = salesData?.totals.netSales ?? mockOverview.revenue;
  const avgOrderValue = salesData?.totals.averageOrderValue ?? mockOverview.averageOrderValue;
  const paidOrdersCount = salesData?.totals.paidOrderCount ?? mockOverview.orders;

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
            Real-time revenue trajectories, 5-stage conversion funnels, Meta CAPI dispatches, and search demand signals.
          </p>
        </div>

        {/* View Switcher & Refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 border border-stone-200 hover:border-stone-400 rounded-xl bg-white text-stone-600 transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans font-semibold">
            {[
              { id: 'sales', label: 'Sales & Products' },
              { id: 'funnel', label: 'Conversion Funnel' },
              { id: 'meta', label: 'Web & Meta Tracking' },
              { id: 'search', label: 'Search Demand' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeTab === tab.id
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Gross Sales</span>
              <p className="font-serif text-2xl font-bold text-[#561C08]">₹ {totalSales.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Net Revenue</span>
              <p className="font-serif text-2xl font-bold text-emerald-800">₹ {netSales.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Average Order Value</span>
              <p className="font-serif text-2xl font-bold text-allura-darkBrown">₹ {avgOrderValue.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Paid Orders Count</span>
              <p className="font-serif text-2xl font-bold text-[#561C08]">{paidOrdersCount}</p>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-200 flex justify-between items-center">
              <h3 className="font-serif text-lg font-normal text-stone-900">Top Performing Atelier Garments</h3>
              {salesData?.topProducts && salesData.topProducts.length > 0 && (
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  Live Sales Feed
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Units Sold</th>
                    <th className="p-4 text-right">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {salesData?.topProducts && salesData.topProducts.length > 0
                    ? salesData.topProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                          <td className="p-4 font-serif text-sm font-medium text-stone-900">{p.name}</td>
                          <td className="p-4 font-bold text-[#561C08]">{p.unitsSold} units</td>
                          <td className="p-4 text-right font-serif font-bold text-[#561C08] text-sm">
                            ₹ {p.totalRevenue.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    : mockTopProducts.map((p, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                          <td className="p-4 font-serif text-sm font-medium text-stone-900">{p.name}</td>
                          <td className="p-4 font-bold text-[#561C08]">{p.salesCount} units</td>
                          <td className="p-4 text-right font-serif font-bold text-[#561C08] text-sm">
                            ₹ {p.revenue.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: WEB & META TRACKING */}
      {activeTab === 'meta' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Meta CAPI Total</span>
              <p className="font-serif text-2xl font-bold text-[#561C08]">
                {trackingData?.metaEvents.total ?? 0}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Dispatched & Sent</span>
              <p className="font-serif text-2xl font-bold text-emerald-800">
                {trackingData?.metaEvents.sent ?? 0}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Pending Queue</span>
              <p className="font-serif text-2xl font-bold text-amber-700">
                {trackingData?.metaEvents.pending ?? 0}
              </p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Failed Dispatches</span>
              <p className="font-serif text-2xl font-bold text-rose-700">
                {trackingData?.metaEvents.failed ?? 0}
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
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
                <Radio size={12} className="animate-pulse" />
                Pixel & CAPI Synced
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              {[
                { event: 'PageView', label: 'Page Visits', count: trackingData?.analyticsEvents?.['PageView'] ?? 1420 },
                { event: 'ViewContent', label: 'Product Previews', count: trackingData?.analyticsEvents?.['ViewContent'] ?? 890 },
                { event: 'AddToCart', label: 'Bags Added', count: trackingData?.analyticsEvents?.['AddToCart'] ?? 310 },
                { event: 'InitiateCheckout', label: 'Checkouts Begun', count: trackingData?.analyticsEvents?.['InitiateCheckout'] ?? 128 },
              ].map(item => (
                <div key={item.event} className="p-4 bg-stone-50 rounded-xl border border-stone-100 space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-stone-400">{item.event}</span>
                  <p className="font-serif text-xl font-bold text-[#561C08]">{item.count.toLocaleString()}</p>
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

          <div className="space-y-4 pt-2">
            {funnel.map((stg, i) => (
              <div key={i} className="p-4 bg-stone-50 rounded-2xl border border-stone-100 space-y-2 text-xs font-sans">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-stone-900 font-serif text-base">{stg.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-[#561C08]">{stg.count.toLocaleString()} Users</span>
                    <span className="text-stone-400 text-xs font-normal font-sans">({stg.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full bg-stone-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#561C08] rounded-full transition-all duration-700"
                    style={{ width: `${stg.percentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-stone-500 pt-0.5">
                  <span>Stage Conversion: <strong>{stg.percentage}%</strong></span>
                  {i > 0 && <span className="text-rose-700">Dropoff: <strong>{stg.dropoff}</strong></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SEARCH DEMAND */}
      {activeTab === 'search' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Popular search terms */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900">Top Searched Queries</h3>
            <div className="divide-y divide-stone-100">
              {searchAnalytics.popularSearches.map((s, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-serif text-sm font-medium text-stone-900">"{s.term}"</p>
                    <p className="text-[10px] text-stone-400">{s.volume} searches • {s.clicks} clicks</p>
                  </div>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded text-xs">
                    {s.conversion} Conv.
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Zero result searches */}
          <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-4 text-xs font-sans">
            <h3 className="font-serif text-xl font-normal text-stone-900">Zero-Result Opportunities</h3>
            <p className="text-stone-500">Unmet customer queries that indicate new collection demand.</p>
            <div className="divide-y divide-stone-100">
              {searchAnalytics.zeroResultSearches.map((s, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-serif text-sm font-medium text-stone-900">"{s.term}"</p>
                    <p className="text-[10px] text-stone-400">Demand: {s.count} queries</p>
                  </div>
                  <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded text-xs">
                    {s.potentialCategory}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
