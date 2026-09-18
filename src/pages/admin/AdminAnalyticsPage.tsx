import React, { useState } from 'react';
import { mockAnalyticsData } from '../../data/mockAnalytics';

export const AdminAnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'funnel' | 'search'>('sales');
  const { overview, funnel, topProducts, searchAnalytics } = mockAnalyticsData;

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
            Real-time revenue trajectories, 5-stage conversion funnels, top garments, and search demand signals.
          </p>
        </div>

        {/* View Switcher */}
        <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200 text-xs font-sans font-semibold">
          {[
            { id: 'sales', label: 'Sales & Products' },
            { id: 'funnel', label: 'Conversion Funnel' },
            { id: 'search', label: 'Search Demand' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-lg transition-colors ${
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

      {/* TAB 1: SALES & PRODUCTS */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Total Sales</span>
              <p className="font-serif text-2xl font-bold text-stone-900">₹ {overview.revenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Average Order Value</span>
              <p className="font-serif text-2xl font-bold text-allura-darkBrown">₹ {overview.averageOrderValue.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Conversion Rate</span>
              <p className="font-serif text-2xl font-bold text-emerald-800">{overview.conversionRate}%</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-stone-400">Refund Rate</span>
              <p className="font-serif text-2xl font-bold text-stone-700">{overview.refundRate}%</p>
            </div>
          </div>

          {/* Top Products Table */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-stone-200">
              <h3 className="font-serif text-lg font-normal text-stone-900">Top Performing Atelier Garments</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                    <th className="p-4">Product Name</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Product Views</th>
                    <th className="p-4">Add to Bag Rate</th>
                    <th className="p-4">Units Sold</th>
                    <th className="p-4 text-right">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {topProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                      <td className="p-4 font-serif text-sm font-medium text-stone-900">{p.name}</td>
                      <td className="p-4 text-stone-500">{p.category}</td>
                      <td className="p-4 font-mono font-bold">{p.views.toLocaleString()}</td>
                      <td className="p-4 text-emerald-800 font-semibold">{p.addToCartRate}</td>
                      <td className="p-4 font-bold text-stone-900">{p.salesCount} units</td>
                      <td className="p-4 text-right font-serif font-bold text-stone-900 text-sm">
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
                    <span className="font-mono font-bold text-stone-800">{stg.count.toLocaleString()} Users</span>
                    <span className="text-stone-400 text-xs font-normal font-sans">({stg.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full bg-stone-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-stone-900 rounded-full transition-all duration-700"
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
