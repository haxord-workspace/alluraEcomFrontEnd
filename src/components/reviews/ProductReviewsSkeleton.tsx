import React from 'react';

/** Loading placeholder for the Product Details reviews section (summary + review cards). */
export const ReviewCardsSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4" aria-hidden="true">
    {[...Array(count)].map((_, idx) => (
      <div key={idx} className="bg-allura-card border border-allura-border rounded-2xl p-5 shadow-subtle space-y-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-stone-200" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-28 bg-stone-300/80 rounded" />
            <div className="h-3 w-20 bg-stone-200 rounded" />
          </div>
        </div>
        <div className="h-4 w-2/3 bg-stone-300/80 rounded" />
        <div className="h-3 w-full bg-stone-200 rounded" />
        <div className="h-3 w-5/6 bg-stone-200 rounded" />
      </div>
    ))}
  </div>
);

export const ProductReviewsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10" role="status" aria-label="Loading reviews">
    <div className="lg:col-span-4">
      <div className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4 animate-pulse" aria-hidden="true">
        <div className="h-10 w-20 bg-stone-300/80 rounded" />
        <div className="h-4 w-32 bg-stone-200 rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-2.5 w-full bg-stone-200 rounded-full" />
        ))}
      </div>
    </div>
    <div className="lg:col-span-8">
      <ReviewCardsSkeleton />
    </div>
  </div>
);
