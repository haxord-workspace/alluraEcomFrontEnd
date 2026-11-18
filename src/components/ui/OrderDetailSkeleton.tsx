import React from 'react';

export const OrderDetailSkeleton: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 animate-pulse">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-allura-border/60 pb-6">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-stone-200 rounded" />
          <div className="flex items-center gap-3">
            <div className="h-7 w-48 bg-stone-300/80 rounded" />
            <div className="h-6 w-24 bg-stone-200 rounded-full" />
          </div>
          <div className="h-3 w-64 bg-stone-200 rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-36 bg-stone-200 rounded-xl" />
          <div className="h-9 w-28 bg-stone-200 rounded-xl" />
        </div>
      </div>

      {/* Timeline tracker */}
      <div className="bg-allura-card border border-allura-border rounded-2xl p-6 sm:p-8 shadow-subtle space-y-4">
        <div className="h-4 w-40 bg-stone-300/70 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-2 w-full bg-stone-200 rounded" />
              <div className="h-3 w-20 bg-stone-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Items & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Ordered Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4">
            <div className="h-4 w-32 bg-stone-300/80 rounded" />
            <div className="space-y-4 pt-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-4 p-3 bg-stone-100/50 rounded-xl">
                  <div className="w-20 h-24 bg-stone-300/70 rounded-lg flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-stone-300/80 rounded" />
                    <div className="h-3 w-1/2 bg-stone-200 rounded" />
                    <div className="h-4 w-1/4 bg-stone-300/80 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Summary & Address */}
        <div className="space-y-6">
          <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4">
            <div className="h-4 w-32 bg-stone-300/80 rounded" />
            <div className="space-y-2 pt-2">
              <div className="h-3 w-full bg-stone-200 rounded" />
              <div className="h-3 w-4/5 bg-stone-200 rounded" />
              <div className="h-3 w-2/3 bg-stone-200 rounded" />
            </div>
          </div>

          <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-3">
            <div className="h-4 w-28 bg-stone-300/80 rounded" />
            <div className="space-y-2 pt-1">
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-stone-200 rounded" />
                <div className="h-3 w-16 bg-stone-200 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-16 bg-stone-200 rounded" />
                <div className="h-3 w-16 bg-stone-200 rounded" />
              </div>
              <div className="flex justify-between pt-2 border-t border-stone-200">
                <div className="h-4 w-20 bg-stone-300/80 rounded" />
                <div className="h-4 w-20 bg-stone-300/80 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
