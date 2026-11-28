import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePromotions } from '../../hooks/usePromotions';
import { PromotionCard } from './PromotionCard';
import { PromotionCardWithBackground } from './PromotionCardWithBackground';
import { PromotionProductList } from './PromotionProductList';
import { PromotionCategory } from './PromotionCategory';
import { PromotionCollection } from './PromotionCollection';
import type { StorePromotion } from '../../types/storePromotion';

const AUTOPLAY_INTERVAL_MS = 5000; // 5 seconds
const MANUAL_PAUSE_DURATION_MS = 300000; // 5 minutes (300,000 ms)
const VIEW_ALL_PAUSE_DURATION_MS = 9000; // 9 seconds

const PromotionsSkeleton: React.FC = () => (
  <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" aria-hidden="true">
    <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 border-b border-[#561C08]/15 pb-4 max-md:mb-3 max-md:pb-2.5">
      <div className="h-6 sm:h-8 w-48 bg-[#561C08]/10 rounded animate-pulse" />
    </div>

    {/* Promotion Card Skeleton */}
    <div className="h-64 sm:h-72 rounded-2xl sm:rounded-3xl bg-[#561C08]/10 allura-shimmer w-full mb-6" />

    {/* Product Cards Row Skeleton */}
    <div className="flex items-stretch gap-4 overflow-hidden">
      <div className="w-[195px] sm:w-[220px] lg:flex-1 h-64 rounded-2xl bg-[#561C08]/10 allura-shimmer flex-shrink-0" />
      <div className="w-[195px] sm:w-[220px] lg:flex-1 h-64 rounded-2xl bg-[#561C08]/10 allura-shimmer flex-shrink-0" />
      <div className="hidden sm:block w-[220px] lg:flex-1 h-64 rounded-2xl bg-[#561C08]/10 allura-shimmer flex-shrink-0" />
      <div className="hidden lg:block lg:flex-1 h-64 rounded-2xl bg-[#561C08]/10 allura-shimmer flex-shrink-0" />
      <div className="hidden lg:block lg:flex-1 h-64 rounded-2xl bg-[#561C08]/10 allura-shimmer flex-shrink-0" />
    </div>
  </section>
);

interface ActivePromotionBlockProps {
  promotion: StorePromotion;
  index: number;
  total: number;
  onExpire: (id: string) => void;
  onExpandProducts?: () => void;
}

/**
 * Renders the persistent shell for the active promotion.
 * Does NOT unmount or remount when promotion changes.
 * The underlying PromotionCard, Category, and Product components receive new props smoothly.
 */
const ActivePromotionBlock: React.FC<ActivePromotionBlockProps> = ({
  promotion,
  index,
  total,
  onExpire,
  onExpandProducts,
}) => {
  const scopeType = promotion.applicableTo?.type || 'ALL';
  // Backend-driven: an admin-uploaded banner image switches to the premium background
  // design; everything else keeps the existing coupon/ticket card unchanged.
  const hasBackgroundImage = Boolean(promotion.backgroundImage?.url?.trim());
  const PromoCardComponent = hasBackgroundImage ? PromotionCardWithBackground : PromotionCard;

  return (
    <div className="flex flex-col w-full">
      {/* 1. Main Promotion Card (Ticket design, or the image-background design when set) */}
      <PromoCardComponent
        promotion={promotion}
        variant="featured"
        className="w-full"
        animationDelayMs={0}
        onExpire={onExpire}
        index={index}
        total={total}
      />

      {/* 2. Conditional Promotion Scope Content */}

      {/* CATEGORIES: Display category chips or banner underneath */}
      {scopeType === 'CATEGORIES' && promotion.categories && promotion.categories.length > 0 && (
        <PromotionCategory categories={promotion.categories} />
      )}

      {/* COLLECTIONS: Display collection information underneath */}
      {scopeType === 'COLLECTIONS' && promotion.collections && promotion.collections.length > 0 && (
        <PromotionCollection collections={promotion.collections} />
      )}

      {/* 3. Applicable Products: Display up to 4 desktop / 2 mobile products, expandable via View All */}
      {/* Note: Storewide 'ALL' promotions do not render an empty product row */}
      {scopeType !== 'ALL' && (
        <PromotionProductList promotion={promotion} onExpand={onExpandProducts} />
      )}
    </div>
  );
};

export const PromotionsSection: React.FC = () => {
  const { promotions, isLoading } = usePromotions();
  const [visible, setVisible] = useState<StorePromotion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Manual pause state (5 minutes)
  const manualPauseUntilRef = useRef<number>(0);
  // View All pause state (9 seconds)
  const viewAllPauseUntilRef = useRef<number>(0);

  const autoplayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisible(promotions);
    // Keep activeIndex valid when promotions list changes
    setActiveIndex((current) => (promotions.length > 0 ? current % promotions.length : 0));
  }, [promotions]);

  const handleExpire = useCallback((id: string) => {
    setVisible((current) => {
      const nextList = current.filter((promo) => promo.id !== id);
      return nextList;
    });
  }, []);

  const total = visible.length;

  // Change slide without unmounting the outer shell
  const goToSlide = useCallback((newIndex: number) => {
    if (total <= 1) return;
    setActiveIndex(newIndex);
  }, [total]);

  // Autoplay engine: dynamically schedules next slide after all pauses expire
  const scheduleNextAutoplay = useCallback(() => {
    if (autoplayTimerRef.current) {
      clearTimeout(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }

    if (total <= 1) return;

    const now = Date.now();
    const activePauseUntil = Math.max(manualPauseUntilRef.current, viewAllPauseUntilRef.current);
    const delay = activePauseUntil > now
      ? (activePauseUntil - now) + AUTOPLAY_INTERVAL_MS
      : AUTOPLAY_INTERVAL_MS;

    autoplayTimerRef.current = setTimeout(() => {
      if (document.hidden) {
        // Tab hidden, wait and reschedule when active
        return;
      }
      const checkNow = Date.now();
      const currentPauseUntil = Math.max(manualPauseUntilRef.current, viewAllPauseUntilRef.current);
      if (checkNow < currentPauseUntil) {
        // Still paused, re-schedule
        scheduleNextAutoplay();
        return;
      }

      // Advance to next promotion
      setActiveIndex((prev) => (prev + 1) % total);
    }, delay);
  }, [total]);

  // Next Slide Action (Manual navigation: 5-minute pause)
  const nextSlide = useCallback((isManual = false) => {
    if (total <= 1) return;
    if (isManual) {
      manualPauseUntilRef.current = Date.now() + MANUAL_PAUSE_DURATION_MS;
    }
    const nextIdx = (activeIndex + 1) % total;
    goToSlide(nextIdx);
    scheduleNextAutoplay();
  }, [activeIndex, total, goToSlide, scheduleNextAutoplay]);

  // Previous Slide Action (Manual navigation: 5-minute pause)
  const prevSlide = useCallback((isManual = false) => {
    if (total <= 1) return;
    if (isManual) {
      manualPauseUntilRef.current = Date.now() + MANUAL_PAUSE_DURATION_MS;
    }
    const prevIdx = (activeIndex - 1 + total) % total;
    goToSlide(prevIdx);
    scheduleNextAutoplay();
  }, [activeIndex, total, goToSlide, scheduleNextAutoplay]);

  // Manual Indicator / Dot Click (5-minute pause)
  const selectSlide = useCallback((index: number) => {
    if (index === activeIndex || index < 0 || index >= total) return;
    manualPauseUntilRef.current = Date.now() + MANUAL_PAUSE_DURATION_MS;
    goToSlide(index);
    scheduleNextAutoplay();
  }, [activeIndex, total, goToSlide, scheduleNextAutoplay]);

  // Handle View All Products click (9-second pause without overriding 5-minute pause)
  const handleExpandProducts = useCallback(() => {
    const targetTime = Date.now() + VIEW_ALL_PAUSE_DURATION_MS;
    // Set 9-second pause timestamp (priority rule: Math.max ensures it never shortens an active 5-minute manual pause)
    viewAllPauseUntilRef.current = targetTime;
    // Reschedule so next rotation happens 9s (pause) + 5s (interval) = 14s later
    scheduleNextAutoplay();
  }, [scheduleNextAutoplay]);

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prevSlide(true);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      nextSlide(true);
    }
  };

  // Autoplay Lifecycle Effect
  useEffect(() => {
    scheduleNextAutoplay();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scheduleNextAutoplay();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (autoplayTimerRef.current) {
        clearTimeout(autoplayTimerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeIndex, total, scheduleNextAutoplay]);

  if (isLoading) {
    return <PromotionsSkeleton />;
  }

  // If visible.length === 0, hide the entire promotion section
  if (total === 0) {
    return null;
  }

  const currentPromotion = visible[activeIndex] || visible[0];
  // The image-background card breaks out to full viewport width on desktop; the ticket
  // design never overflows its container, so only it needs `overflow-hidden` kept.
  const currentHasBackgroundImage = Boolean(currentPromotion?.backgroundImage?.url?.trim());

  return (
    <section
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6"
      aria-label="Current Promotions and Offers"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ─── SECTION HEADER ROW ─── */}
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-8 border-b border-[#561C08]/15 pb-4 max-md:mb-3 max-md:pb-2.5">
        <h2 className="font-heading text-xl sm:text-3xl lg:text-4xl text-[#000000] font-bold uppercase tracking-tight max-md:text-[15px] max-md:font-semibold max-md:tracking-[0.06em] max-md:leading-[1.2] max-md:whitespace-nowrap">
          CURRENT OFFERS
        </h2>

        {total > 1 ? (
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Offer Counter: 1 / 3 OFFERS */}
            <span className="text-xs sm:text-sm font-sans font-bold tabular-nums text-[#561C08]/80 select-none uppercase tracking-wider">
              {activeIndex + 1} / {total} OFFERS
            </span>

            {/* Manual Navigation Controls */}
            <div className="flex items-center gap-1.5" role="group" aria-label="Promotion Navigation">
              <button
                type="button"
                onClick={() => prevSlide(true)}
                aria-label="Previous Offer"
                title="Previous Offer"
                className="w-8 h-8 rounded-full border border-[#561C08]/20 flex items-center justify-center transition-all text-[#561C08] hover:bg-[#561C08]/10 active:scale-95 cursor-pointer bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#561C08]/30"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                type="button"
                onClick={() => nextSlide(true)}
                aria-label="Next Offer"
                title="Next Offer"
                className="w-8 h-8 rounded-full border border-[#561C08]/20 flex items-center justify-center transition-all text-[#561C08] hover:bg-[#561C08]/10 active:scale-95 cursor-pointer bg-white shadow-xs focus:outline-none focus:ring-2 focus:ring-[#561C08]/30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          <span className="text-xs sm:text-sm font-sans font-bold tabular-nums text-[#561C08]/80 select-none uppercase tracking-wider">
            1 Active Offer
          </span>
        )}
      </div>

      {/* ─── SINGLE ACTIVE PROMOTION DISPLAY CONTAINER ─── */}
      <div className={`w-full relative ${currentHasBackgroundImage ? 'overflow-visible' : 'overflow-hidden'}`}>
        <div className="w-full flex flex-col">
          <ActivePromotionBlock
            promotion={currentPromotion}
            index={activeIndex}
            total={total}
            onExpire={handleExpire}
            onExpandProducts={handleExpandProducts}
          />
        </div>
      </div>

      {/* ─── CAROUSEL INDICATOR DOTS ─── */}
      {total > 1 && (
        <div
          className="flex items-center justify-center gap-2 mt-5 sm:mt-6"
          role="tablist"
          aria-label="Promotion slides"
        >
          {visible.map((promo, idx) => (
            <button
              key={promo.id || `dot-${idx}`}
              type="button"
              role="tab"
              aria-selected={idx === activeIndex}
              aria-label={`Go to promotion ${idx + 1}`}
              onClick={() => selectSlide(idx)}
              className={`h-2 transition-all duration-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#561C08]/40 ${
                idx === activeIndex
                  ? 'w-6 bg-[#561C08]'
                  : 'w-2 bg-[#561C08]/20 hover:bg-[#561C08]/40'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
};
