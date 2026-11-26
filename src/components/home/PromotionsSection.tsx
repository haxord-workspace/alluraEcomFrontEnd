import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { usePromotions } from '../../hooks/usePromotions';
import { PromotionCard } from './PromotionCard';
import type { StorePromotion } from '../../types/storePromotion';

const SKELETON_CARD_CLASS = 'h-64 sm:h-72 rounded-2xl sm:rounded-3xl bg-[#561C08]/10 allura-shimmer flex-shrink-0';

const PromotionsSkeleton: React.FC = () => (
  <section className="max-w-7xl mx-auto px-6 lg:px-8" aria-hidden="true">
    <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 border-b border-[#561C08]/15 pb-4 max-md:mb-3 max-md:pb-2.5">
      <div className="h-6 sm:h-8 w-48 bg-[#561C08]/10 rounded animate-pulse" />
    </div>
    <div className="flex items-stretch gap-4 sm:gap-6 overflow-hidden">
      <div className={`w-[86%] sm:w-1/2 lg:w-1/3 ${SKELETON_CARD_CLASS}`} />
      <div className={`hidden sm:block w-1/2 lg:w-1/3 ${SKELETON_CARD_CLASS}`} />
      <div className={`hidden lg:block w-1/3 ${SKELETON_CARD_CLASS}`} />
    </div>
  </section>
);

/** Layout classes per promo count:
 * - 1 promo: full width wide ticket
 * - 2-3 promos: 2-3 columns on desktop (>=1024px), horizontal scroll row on mobile/tablet (<1024px)
 * - >3 promos: 3 cards visible carousel on desktop (>=1024px), horizontal scroll row on mobile/tablet (<1024px)
 */
function getLayoutClasses(count: number): { track: string; card: string; variant: 'featured' | 'grid' } {
  if (count === 1) {
    return { track: 'w-full py-2', card: 'w-full', variant: 'featured' };
  }
  if (count === 2) {
    return {
      track:
        'flex items-stretch gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pt-2 pb-5 lg:grid lg:grid-cols-2 lg:gap-6 lg:overflow-visible lg:py-2',
      card: 'w-[86%] sm:w-[calc(50%_-_12px)] lg:w-full flex-shrink-0 h-full',
      variant: 'grid',
    };
  }
  if (count === 3) {
    return {
      track:
        'flex items-stretch gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pt-2 pb-5 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:py-2',
      card: 'w-[86%] sm:w-[calc(50%_-_12px)] lg:w-full flex-shrink-0 h-full',
      variant: 'grid',
    };
  }
  // > 3 promos: 3 cards visible carousel on desktop, scroll-snap row on mobile
  return {
    track:
      'flex items-stretch gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pt-2 pb-5 lg:py-2',
    card: 'w-[86%] sm:w-[calc(50%_-_12px)] lg:w-[calc((100%_-_48px)_/_3)] flex-shrink-0 h-full',
    variant: 'grid',
  };
}

const PromotionsSectionInner: React.FC = () => {
  const { promotions, isLoading } = usePromotions();
  const [visible, setVisible] = useState<StorePromotion[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [canScroll, setCanScroll] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Desktop mouse drag to scroll
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    setVisible(promotions);
  }, [promotions]);

  const handleExpire = useCallback((id: string) => {
    setVisible((current) => current.filter((promotion) => promotion.id !== id));
  }, []);

  const count = visible.length;

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el || count <= 1) {
      setCanScroll(false);
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const hasOverflow = scrollWidth > clientWidth + 4;
    setCanScroll(hasOverflow);
    setCanScrollPrev(scrollLeft > 6);
    setCanScrollNext(scrollLeft < scrollWidth - clientWidth - 6);

    const firstChild = el.children[0] as HTMLElement | undefined;
    if (firstChild) {
      const cardWidth = firstChild.offsetWidth + 16;
      const index = Math.round(scrollLeft / Math.max(1, cardWidth));
      setActiveSlide(Math.min(Math.max(0, index), count - 1));
    }
  }, [count]);

  useEffect(() => {
    updateScrollState();
    const el = trackRef.current;
    if (!el) return;

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateScrollState);
      ro.observe(el);
    }
    window.addEventListener('resize', updateScrollState);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState, count]);

  const handleScroll = useCallback(() => {
    window.requestAnimationFrame(updateScrollState);
  }, [updateScrollState]);

  const scrollByCard = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const firstCard = el.children[0] as HTMLElement | undefined;
    const amount = (firstCard?.offsetWidth || 340) + 16;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: prefersReduced ? 'auto' : 'smooth',
    });
  };

  const scrollToSlide = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const firstCard = el.children[0] as HTMLElement | undefined;
    if (!firstCard) return;
    const cardWidth = firstCard.offsetWidth + 16;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ left: index * cardWidth, behavior: prefersReduced ? 'auto' : 'smooth' });
    setActiveSlide(index);
  };

  // Keyboard navigation on scroll container
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollByCard('left');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollByCard('right');
    }
  };

  // Mouse click-drag handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const el = trackRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
    hasMovedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const el = trackRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.2;
    if (Math.abs(walk) > 4) {
      hasMovedRef.current = true;
      el.scrollLeft = scrollLeftRef.current - walk;
    }
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  if (isLoading) return <PromotionsSkeleton />;
  if (count === 0) return null;

  const { track, card, variant } = getLayoutClasses(count);
  const showNavControls = count > 1 && canScroll;

  return (
    <section className="max-w-7xl mx-auto px-6 lg:px-8">
      {/* ─── HEADER ROW ─── */}
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 border-b border-[#561C08]/15 pb-4 max-md:mb-3 max-md:pb-2.5">
        <h2 className="font-heading text-xl sm:text-3xl lg:text-4xl text-[#000000] font-bold uppercase tracking-tight max-md:text-[15px] max-md:font-semibold max-md:tracking-[0.06em] max-md:leading-[1.2] max-md:whitespace-nowrap">
          CURRENT OFFERS
        </h2>

        {/* Right side controls: counter and navigation arrows */}
        {showNavControls && (
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* Slide Counter */}
            <span
              className="text-xs sm:text-sm font-sans font-bold tabular-nums text-[#561C08]/80 mr-0.5 sm:mr-1 select-none"
              aria-live="polite"
            >
              <span className="hidden lg:inline">
                {Math.min(count, activeSlide + 3)} / {count}
              </span>
              <span className="lg:hidden">
                {activeSlide + 1} / {count}
              </span>
            </span>

            {/* Navigation Arrows (identical styling to category carousel) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => scrollByCard('left')}
                disabled={!canScrollPrev}
                aria-label="Previous offer"
                aria-disabled={!canScrollPrev}
                className="w-8 h-8 sm:w-9 sm:h-9 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-full flex items-center justify-center border transition-all duration-300 border-[#561C08]/30 text-[#561C08] hover:bg-[#561C08] hover:text-white shadow-xs cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-25 disabled:pointer-events-none disabled:hover:scale-100"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard('right')}
                disabled={!canScrollNext}
                aria-label="Next offer"
                aria-disabled={!canScrollNext}
                className="w-8 h-8 sm:w-9 sm:h-9 min-w-[36px] min-h-[36px] sm:min-w-[40px] sm:min-h-[40px] rounded-full flex items-center justify-center border transition-all duration-300 border-[#561C08]/30 text-[#561C08] hover:bg-[#561C08] hover:text-white shadow-xs cursor-pointer hover:scale-105 active:scale-95 disabled:opacity-25 disabled:pointer-events-none disabled:hover:scale-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── SCROLLABLE CAROUSEL CONTAINER ─── */}
      <div className="relative">
        <div
          ref={trackRef}
          role="region"
          aria-label="Current offers"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClickCapture={(e) => {
            if (hasMovedRef.current) {
              e.stopPropagation();
              hasMovedRef.current = false;
            }
          }}
          className={`${track || ''} touch-pan-x cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-[#561C08]/40 rounded-xl`}
          style={{
            scrollSnapType: count > 1 ? 'x mandatory' : undefined,
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
          }}
        >
          {visible.map((promotion, index) => (
            <PromotionCard
              key={promotion.id}
              promotion={promotion}
              variant={variant}
              className={card}
              animationDelayMs={index * 80}
              onExpire={handleExpire}
              index={index}
              total={count}
            />
          ))}
        </div>
      </div>

      {/* ─── PAGINATION INDICATORS (DOTS OR PROGRESS BAR) ─── */}
      {showNavControls && (
        <div className="mt-3.5">
          {count <= 8 ? (
            /* Dot indicators */
            <div
              className="flex justify-center items-center gap-1.5"
              role="tablist"
              aria-label="Offers carousel pagination"
            >
              {visible.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={activeSlide === i}
                  aria-label={`Go to offer ${i + 1}`}
                  onClick={() => scrollToSlide(i)}
                  className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#561C08]/50 ${activeSlide === i
                    ? 'w-6 bg-[#561C08]'
                    : 'w-1.5 bg-[#561C08]/25 hover:bg-[#561C08]/50'
                    }`}
                />
              ))}
            </div>
          ) : (
            /* Progress bar for > 8 promos */
            <div
              className="max-w-xs mx-auto h-1 bg-[#561C08]/15 rounded-full overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="h-full bg-[#561C08] rounded-full transition-all duration-300"
                style={{ width: `${((activeSlide + 1) / count) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export const PromotionsSection: React.FC = () => <PromotionsSectionInner />;
