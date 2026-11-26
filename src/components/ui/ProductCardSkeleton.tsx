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
          className="group relative flex flex-col select-none bg-white rounded-2xl overflow-hidden shadow-xs animate-pulse"
        >
          {/* Image Container Skeleton */}
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-stone-200/80">
            {/* Shimmer gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
            {/* Floating wishlist button placeholder */}
            <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 shadow-xs" />
          </div>

          {/* Details Skeleton */}
          <div className="px-3.5 pt-2.5 pb-3 space-y-2 flex-1 flex flex-col justify-between">
            <div className="space-y-1">
              {/* Category label placeholder */}
              <div className="h-2.5 w-16 bg-stone-200 rounded" />
              {/* Title lines */}
              <div className="h-4 w-4/5 bg-stone-300/80 rounded" />
            </div>

            {/* Price & Action */}
            <div className="pt-1 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="h-4 w-14 bg-stone-300/90 rounded" />
                <div className="h-3 w-10 bg-stone-200 rounded" />
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-300" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
