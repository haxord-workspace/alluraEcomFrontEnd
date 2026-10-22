import React from 'react';

interface OrderCardSkeletonProps {
  count?: number;
}

export const OrderCardSkeleton: React.FC<OrderCardSkeletonProps> = ({ count = 3 }) => {
  return (
    <div className="space-y-6">
      {[...Array(count)].map((_, idx) => (
        <div
          key={idx}
          className="bg-allura-card border border-allura-border rounded-2xl p-5 sm:p-6 shadow-subtle space-y-5 animate-pulse"
        >
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-allura-border/60">
            <div className="flex items-center gap-3">
              <div className="h-5 w-32 bg-stone-300/80 rounded" />
              <div className="h-4 w-20 bg-stone-200 rounded" />
              <div className="h-5 w-24 bg-stone-200 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-12 bg-stone-200 rounded" />
              <div className="h-5 w-20 bg-stone-300/80 rounded" />
            </div>
          </div>

          {/* Items Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(2)].map((__, itemIdx) => (
              <div key={itemIdx} className="flex items-center gap-4 bg-stone-100/60 p-3 rounded-xl border border-stone-200/50">
                <div className="w-16 h-20 bg-stone-300/70 rounded-lg flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-3/4 bg-stone-300/80 rounded" />
                  <div className="h-3 w-1/2 bg-stone-200 rounded" />
                  <div className="h-3.5 w-1/3 bg-stone-300/70 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-allura-border/40">
            <div className="h-9 w-28 bg-stone-200 rounded-xl" />
            <div className="h-9 w-32 bg-stone-300/80 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};
