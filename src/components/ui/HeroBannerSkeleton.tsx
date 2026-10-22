import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const HeroBannerSkeleton: React.FC = () => {
  return (
    <section className="relative w-full min-h-[520px] h-[78vh] sm:h-auto sm:min-h-[580px] lg:h-[84vh] lg:max-h-[820px] overflow-hidden bg-[#EFE8DF] animate-pulse">
      {/* Background Architectural & Model Silhouette Placeholder (Right-Aligned) */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Soft studio warm backdrop */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#DFD6CA] via-[#EAE1D5] to-[#F3ECE2]" />

        {/* Studio Archway & Model Silhouette representation on the right */}
        <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[58%] lg:w-[50%] flex items-end justify-center pointer-events-none">
          {/* Arch subtle curve */}
          <div className="absolute top-10 w-[78%] h-[85%] rounded-t-[140px] border-4 border-white/30 bg-white/15" />
          
          {/* Standing Model Silhouette */}
          <div className="relative z-10 w-[240px] sm:w-[320px] lg:w-[380px] h-[85%] flex flex-col items-center">
            {/* Model head & posture */}
            <div className="w-16 h-20 rounded-full bg-stone-400/25 mb-2" />
            {/* Model bodice / shoulders */}
            <div className="w-28 sm:w-36 h-24 rounded-t-3xl bg-stone-400/30" />
            {/* Flowing couture gown & dupatta flare */}
            <div className="w-full flex-1 rounded-t-2xl bg-gradient-to-t from-stone-400/35 via-stone-400/25 to-stone-400/20" />
          </div>
        </div>

        {/* Shimmer light beam across the entire banner */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent -translate-x-full animate-[pulse_2.2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
      </div>

      {/* Protective Luxury Gradient Overlay matching live banner */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/35 to-transparent sm:from-stone-950/70 sm:via-stone-950/20 sm:to-transparent z-10 pointer-events-none" />

      {/* Hero Content Container (Left-aligned, bottom-anchored) */}
      <div className="max-w-7xl mx-auto h-full px-5 sm:px-6 lg:px-8 relative z-20 flex items-end justify-between w-full pb-20 sm:pb-28 lg:pb-32">
        <div className="max-w-xl space-y-4 pt-4 sm:pt-0 w-full pr-14 sm:pr-0">
          {/* 3-line headline placeholder matching "GRACE AND GRANDEUR, ONE STITCH AT A TIME." */}
          <div className="space-y-3">
            <div className="h-8 sm:h-12 lg:h-[50px] w-[88%] sm:w-[420px] bg-white/80 rounded-xl shadow-xs" />
            <div className="h-8 sm:h-12 lg:h-[50px] w-[95%] sm:w-[460px] bg-white/80 rounded-xl shadow-xs" />
            <div className="h-8 sm:h-12 lg:h-[50px] w-[65%] sm:w-[320px] bg-white/75 rounded-xl shadow-xs" />
          </div>

          {/* Subtitle / Description bar */}
          <div className="pt-1 space-y-2 max-w-md">
            <div className="h-3.5 w-full bg-[#F7E6C8]/60 rounded" />
            <div className="h-3.5 w-4/5 bg-[#F7E6C8]/50 rounded" />
          </div>

          {/* CTA Button placeholder matching "SHOP NOW →" */}
          <div className="pt-3 flex items-center gap-3">
            <div className="h-12 sm:h-14 w-40 bg-[#F7E6C8] rounded-xl shadow-md flex items-center justify-between px-5">
              <div className="h-3.5 w-20 bg-[#561C08]/30 rounded" />
              <div className="h-3.5 w-3.5 bg-[#561C08]/30 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Carousel Navigation: Left & Right circular controls matching real banner */}
      <div className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 border border-white/60 backdrop-blur-md flex items-center justify-center shadow-lg text-[#561C08]/40">
        <ChevronLeft size={20} />
      </div>

      <div className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/80 border border-white/60 backdrop-blur-md flex items-center justify-center shadow-lg text-[#561C08]/40">
        <ChevronRight size={20} />
      </div>

      {/* Center Pagination Dots matching real banner */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-stone-900/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
        <div className="h-2 w-6 rounded-full bg-[#F7E6C8]" />
        <div className="h-2 w-2 rounded-full bg-white/50" />
      </div>
    </section>
  );
};
