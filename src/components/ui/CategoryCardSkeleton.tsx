import React from 'react';

interface CategoryCardSkeletonProps {
  count?: number;
}

export const CategoryCardSkeleton: React.FC<CategoryCardSkeletonProps> = ({ count = 5 }) => {
  return (
    <>
      {[...Array(count)].map((_, idx) => (
        <div key={idx} className="flex flex-col items-center animate-pulse w-full">
          {/* Arched image skeleton */}
          <div className="relative w-full aspect-[9/14] sm:aspect-[3/4.8] rounded-t-full rounded-b-2xl sm:rounded-b-3xl overflow-hidden border border-[#561C08]/10 bg-stone-200/80 shadow-xs">
            {/* Shimmer bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
          </div>
          
          {/* Text Below-Arch Skeletons */}
          <div className="mt-3 sm:mt-4 space-y-1.5 w-full flex flex-col items-center">
            <div className="h-3.5 w-24 bg-stone-200 rounded" />
            <div className="h-2.5 w-20 bg-stone-200/60 rounded" />
          </div>
        </div>
      ))}
    </>
  );
};
