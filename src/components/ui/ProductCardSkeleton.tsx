import React from 'react';

interface ProductCardSkeletonProps {
  count?: number;
}

export const ProductCardSkeleton: React.FC<ProductCardSkeletonProps> = ({ count = 1 }) => {
  return (
    <>
      {[...Array(count)].map((_, idx) => (
        <div
          key={idx}
          className="group relative flex flex-col select-none bg-white p-2.5 sm:p-3 rounded-2xl border border-[#561C08]/12 shadow-xs animate-pulse"
        >
          {/* Image Container Skeleton */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-stone-200/80">
            {/* Shimmer gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
            {/* Floating wishlist button placeholder */}
            <div className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/70 shadow-xs" />
          </div>

          {/* Details Skeleton */}
          <div className="pt-3 pb-1 space-y-2 flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
              {/* Category pill placeholder */}
              <div className="h-2.5 w-16 bg-stone-200 rounded" />
              {/* Title lines */}
              <div className="h-3.5 w-4/5 bg-stone-300/80 rounded" />
              <div className="h-3.5 w-3/5 bg-stone-300/70 rounded" />
            </div>

            {/* Price & Rating */}
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-4 w-16 bg-stone-300/90 rounded" />
                <div className="h-3 w-12 bg-stone-200 rounded" />
              </div>
              <div className="h-3 w-10 bg-amber-100 rounded" />
            </div>

            {/* Color swatches placeholder */}
            <div className="pt-1 flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-stone-300/70" />
              <div className="w-3.5 h-3.5 rounded-full bg-stone-300/70" />
              <div className="w-3.5 h-3.5 rounded-full bg-stone-300/70" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
