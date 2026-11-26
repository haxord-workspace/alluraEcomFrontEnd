import React from 'react';

export const CartSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-8 animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <div className="h-3 w-28 bg-stone-200 rounded" />
        <div className="h-8 w-56 bg-stone-300/80 rounded" />
      </div>

      {/* Free shipping bar skeleton */}
      <div className="h-12 w-full bg-stone-200/70 rounded-xl" />

      {/* Grid: Cart Items (left) and Summary (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <div className="lg:col-span-8 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-4 p-4 bg-allura-card rounded-2xl border border-allura-border">
              <div className="w-24 h-32 bg-stone-300/70 rounded-xl flex-shrink-0" />
              <div className="space-y-3 flex-1">
                <div className="h-4 w-3/4 bg-stone-300/80 rounded" />
                <div className="h-3 w-1/3 bg-stone-200 rounded" />
                <div className="h-4 w-1/4 bg-stone-300/80 rounded" />
                <div className="h-8 w-24 bg-stone-200 rounded-lg pt-1" />
              </div>
            </div>
          ))}
        </div>

        {/* Summary side */}
        <div className="lg:col-span-4">
          <div className="bg-allura-card border border-allura-border rounded-2xl p-6 space-y-4">
            <div className="h-5 w-36 bg-stone-300/80 rounded" />
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <div className="h-3 w-20 bg-stone-200 rounded" />
                <div className="h-3 w-16 bg-stone-200 rounded" />
              </div>
              <div className="flex justify-between">
                <div className="h-3 w-24 bg-stone-200 rounded" />
                <div className="h-3 w-16 bg-stone-200 rounded" />
              </div>
              <div className="flex justify-between pt-3 border-t border-stone-200">
                <div className="h-5 w-24 bg-stone-300/80 rounded" />
                <div className="h-5 w-20 bg-stone-300/80 rounded" />
              </div>
            </div>
            <div className="h-12 w-full bg-stone-300/80 rounded-xl mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
