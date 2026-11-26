import React from 'react';

interface AlluraExperienceSkeletonProps {
  mobileTrustStrip?: React.ReactNode;
}

export const AlluraExperienceSkeleton: React.FC<AlluraExperienceSkeletonProps> = ({ mobileTrustStrip }) => {
  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8 animate-pulse" aria-label="Loading Allura Experience">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center max-md:gap-4">
        {/* Left media skeleton */}
        <div className="lg:col-span-5 relative aspect-[4/5] rounded-2xl overflow-hidden bg-stone-200/70 border border-[#561C08]/10" />

        {/* Mobile-only trust strip slot */}
        {mobileTrustStrip && (
          <div className="md:hidden">
            {mobileTrustStrip}
          </div>
        )}

        {/* Center content skeleton */}
        <div className="lg:col-span-4 space-y-5 max-md:space-y-3 max-md:pt-2">
          <div className="h-3.5 w-44 bg-stone-200 rounded-md" />
          <div className="h-9 w-64 bg-stone-200 rounded-lg max-md:h-6" />
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-stone-200 rounded" />
            <div className="h-3.5 w-5/6 bg-stone-200 rounded" />
            <div className="h-3.5 w-3/4 bg-stone-200 rounded" />
          </div>
          <div className="pt-2">
            <div className="h-11 w-36 bg-stone-200 rounded-xl" />
          </div>
        </div>

        {/* Right features skeleton */}
        <div className="lg:col-span-3 space-y-6 lg:border-l lg:border-[#561C08]/15 lg:pl-8 max-md:space-y-4 max-md:pt-1">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-stone-200 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 w-28 bg-stone-200 rounded" />
                <div className="h-3 w-40 bg-stone-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
