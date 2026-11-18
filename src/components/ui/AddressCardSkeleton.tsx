import React from 'react';

interface AddressCardSkeletonProps {
  count?: number;
}

export const AddressCardSkeleton: React.FC<AddressCardSkeletonProps> = ({ count = 2 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(count)].map((_, idx) => (
        <div
          key={idx}
          className="bg-allura-card border border-allura-border rounded-2xl p-6 shadow-subtle space-y-4 animate-pulse"
        >
          <div className="flex justify-between items-center">
            <div className="h-4 w-16 bg-stone-200 rounded" />
            <div className="h-4 w-24 bg-stone-200 rounded" />
          </div>

          <div className="space-y-2 pt-1">
            <div className="h-4 w-36 bg-stone-300/80 rounded" />
            <div className="h-3 w-4/5 bg-stone-200 rounded" />
            <div className="h-3 w-3/5 bg-stone-200 rounded" />
            <div className="h-3 w-28 bg-stone-200 rounded" />
          </div>

          <div className="pt-2 border-t border-allura-border flex gap-3">
            <div className="h-4 w-12 bg-stone-200 rounded" />
            <div className="h-4 w-14 bg-stone-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
