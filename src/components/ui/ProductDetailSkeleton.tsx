import React from 'react';

export const ProductDetailSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 sm:pt-6 pb-24 lg:pb-12 animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2 mb-3 sm:mb-6">
        <div className="h-3 w-12 bg-stone-300/60 rounded" />
        <span className="text-stone-300">/</span>
        <div className="h-3 w-14 bg-stone-300/60 rounded" />
        <span className="text-stone-300">/</span>
        <div className="h-3 w-20 bg-stone-300/60 rounded" />
        <span className="text-stone-300">/</span>
        <div className="h-3 w-28 bg-stone-300/70 rounded" />
      </div>

      {/* Main Product Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        {/* Left: Gallery Skeleton (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/5] w-full rounded-lg bg-stone-200/80 border border-allura-border/40 relative overflow-hidden shadow-subtle">
            {/* Shimmer light bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
            {/* Action buttons placeholder */}
            <div className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/70 shadow-xs" />
            <div className="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/70 shadow-xs" />
          </div>

          {/* Thumbnails row */}
          <div className="flex gap-3 overflow-hidden pb-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-20 h-24 rounded bg-stone-200/80 flex-shrink-0 border border-allura-border/30"
              />
            ))}
          </div>
        </div>

        {/* Right: Info & Purchase Skeleton (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Category & Rating */}
          <div className="flex items-center justify-between">
            <div className="h-3.5 w-32 bg-stone-300/70 rounded" />
            <div className="h-3.5 w-24 bg-stone-200/90 rounded" />
          </div>

          {/* Title */}
          <div className="space-y-2.5">
            <div className="h-8 sm:h-9 w-4/5 bg-stone-300/80 rounded" />
            <div className="h-8 sm:h-9 w-3/5 bg-stone-300/80 rounded" />
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 pb-3 border-b border-allura-border/60">
            <div className="h-8 w-28 bg-stone-300/90 rounded" />
            <div className="h-5 w-20 bg-stone-200/70 rounded" />
            <div className="h-5 w-28 bg-emerald-100/70 rounded" />
          </div>

          {/* Description lines */}
          <div className="space-y-2 pt-1">
            <div className="h-3 w-full bg-stone-200/80 rounded" />
            <div className="h-3 w-11/12 bg-stone-200/80 rounded" />
            <div className="h-3 w-3/4 bg-stone-200/80 rounded" />
          </div>

          {/* Color options */}
          <div className="space-y-2.5 pt-2">
            <div className="h-3 w-24 bg-stone-300/70 rounded" />
            <div className="flex items-center gap-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-24 rounded-full bg-stone-200/90 border border-allura-border/40"
                />
              ))}
            </div>
          </div>

          {/* Size options */}
          <div className="space-y-2.5 pt-2">
            <div className="flex justify-between items-center">
              <div className="h-3 w-24 bg-stone-300/70 rounded" />
              <div className="h-3 w-16 bg-stone-200/80 rounded" />
            </div>
            <div className="flex gap-2.5">
              {['XS', 'S', 'M', 'L', 'XL'].map(s => (
                <div
                  key={s}
                  className="w-12 h-11 rounded bg-stone-200/90 border border-allura-border/40"
                />
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center gap-4 pt-1">
            <div className="h-3 w-20 bg-stone-300/70 rounded" />
            <div className="h-10 w-28 rounded bg-stone-200/90 border border-allura-border/40" />
          </div>

          {/* Desktop CTAs */}
          <div className="space-y-3 pt-3 hidden lg:block">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 rounded bg-stone-300/80" />
              <div className="h-12 rounded bg-stone-400/80" />
            </div>
            <div className="h-11 rounded bg-emerald-100/60 border border-emerald-200/50" />
          </div>

          {/* Service Perks */}
          <div className="grid grid-cols-3 gap-2 py-4 border-y border-allura-border/60">
            <div className="h-10 bg-stone-200/70 rounded" />
            <div className="h-10 bg-stone-200/70 rounded" />
            <div className="h-10 bg-stone-200/70 rounded" />
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar Skeleton - Fixed at the very bottom */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-allura-card/98 backdrop-blur-md border-t border-allura-border px-4 py-3 flex items-center gap-3 shadow-luxury safe-bottom">
        <div className="flex-1 h-12 bg-stone-200/90 rounded-lg" />
        <div className="flex-1 h-12 bg-stone-300/90 rounded-lg" />
      </div>
    </div>
  );
};
