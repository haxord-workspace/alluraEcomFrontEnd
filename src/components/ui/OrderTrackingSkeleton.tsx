import React from 'react';

export const OrderTrackingSkeleton: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-8 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-3 w-32 bg-stone-200 rounded mb-2" />
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-stone-300/80 rounded" />
            <div className="h-3.5 w-44 bg-stone-200 rounded" />
          </div>
          <div className="h-6 w-24 bg-stone-200 rounded-full" />
        </div>
      </div>

      {/* Overview Tracking Card */}
      <div className="bg-allura-card border border-allura-border rounded-2xl p-6 sm:p-8 shadow-luxury space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-allura-border/60">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-28 bg-stone-200 rounded" />
              <div className="h-5 w-40 bg-stone-300/80 rounded" />
            </div>
          ))}
        </div>

        {/* Milestones timeline */}
        <div className="space-y-6 pt-4">
          <div className="h-4 w-32 bg-stone-300/80 rounded" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-stone-300/70 flex-shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-44 bg-stone-300/80 rounded" />
                  <div className="h-3 w-72 bg-stone-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
