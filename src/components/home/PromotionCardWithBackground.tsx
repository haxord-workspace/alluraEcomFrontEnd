import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Sparkles, ShoppingBag } from 'lucide-react';
import type { StorePromotion } from '../../types/storePromotion';
import {
  getCtaDestination,
  getDiscountParts,
  formatValidityPeriod,
  getPromotionEyebrow,
  formatCurrency,
} from '../../utils/promotionFormat';
import { PromotionCountdown } from './PromotionCountdown';
import { PromotionCard } from './PromotionCard';

const show = (promo: any, key: string) =>
  promo?.displayOptions?.find((o: any) => o.key === key)?.enabled !== false;
// "!== false" → a missing key or missing array means SHOW (safe default)

interface PromotionCardWithBackgroundProps {
  promotion: StorePromotion;
  variant: 'featured' | 'grid';
  className?: string;
  animationDelayMs?: number;
  onExpire: (id: string) => void;
  index?: number;
  total?: number;
}

/**
 * Premium image-background promotion banner, shown only when the promotion has a valid
 * `backgroundImage.url`. The promotion data itself (including `backgroundImage`) only ever
 * reaches this component once `usePromotions`/`PromotionsSection` has finished loading, so
 * there's nothing to wait on there. The one thing still unknown at mount is whether the image
 * *file* actually loads — a probe `Image()` checks that in the background. While that probe is
 * pending we reserve the final layout with a skeleton (never the no-image ticket design, so it
 * can't flash before swapping to the premium one); the ticket design only appears as a genuine
 * fallback if the image fails to load.
 */
export const PromotionCardWithBackground: React.FC<PromotionCardWithBackgroundProps> = (props) => {
  const { promotion } = props;
  const bgUrl = promotion.backgroundImage?.url;
  const [imgStatus, setImgStatus] = useState<'loading' | 'ok' | 'error'>(bgUrl ? 'loading' : 'error');

  useEffect(() => {
    if (!bgUrl) {
      setImgStatus('error');
      return;
    }
    setImgStatus('loading');
    const probe = new Image();
    probe.onload = () => setImgStatus('ok');
    probe.onerror = () => setImgStatus('error');
    probe.src = bgUrl;
    return () => {
      probe.onload = null;
      probe.onerror = null;
    };
  }, [bgUrl]);

  if (!bgUrl || imgStatus === 'error') {
    return <PromotionCard {...props} />;
  }

  if (imgStatus === 'loading') {
    return <BackgroundCardSkeleton />;
  }

  return <PremiumBackgroundCard {...props} bgUrl={bgUrl} />;
};

/**
 * Reserves the exact footprint of `PremiumBackgroundCard` (matching Category section
 * container width, same min-heights) so swapping to the real card never shifts layout.
 * Shown only for the brief window before the background-image probe resolves — never the no-image ticket design.
 */
const BackgroundCardSkeleton: React.FC = () => (
  <div
    className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-[#561C08]/10 allura-shimmer min-h-[420px] sm:min-h-[400px] lg:min-h-[440px]"
    aria-hidden="true"
  />
);

const PremiumBackgroundCard: React.FC<PromotionCardWithBackgroundProps & { bgUrl: string }> = ({
  promotion,
  className,
  onExpire,
  index = 0,
  total = 1,
  bgUrl,
}) => {
  const [isRemoving, setIsRemoving] = useState(false);

  const discountParts = getDiscountParts(promotion);
  const ctaDestination = getCtaDestination(promotion);
  const validityText = formatValidityPeriod(promotion.startsAt, promotion.expiresAt);
  const eyebrowText = getPromotionEyebrow(
    promotion.startsAt,
    promotion.expiresAt,
    promotion.applicableTo?.type
  );

  const hasMaxDiscount = Boolean(
    promotion.discount?.maxDiscountAmount && promotion.discount.maxDiscountAmount > 0
  );
  const hasMinOrder = Boolean(promotion.minimumOrderValue && promotion.minimumOrderValue > 0);

  const handleExpire = React.useCallback(() => {
    setIsRemoving(true);
    window.setTimeout(() => onExpire(promotion.id), 500);
  }, [onExpire, promotion.id]);

  // Display options visibility flags (safe default: true if missing)
  const showBadge = show(promotion, 'limitedOffer_badge');
  const showName = show(promotion, 'name');
  const showDiscount = show(promotion, 'discount');
  const showTimeText = show(promotion, 'time_text');
  const showTimeCounting = show(promotion, 'time_counting');
  const showShopNow = show(promotion, 'shopnow_button');

  const hasAnyVisible =
    showBadge || showName || showDiscount || showTimeText || showTimeCounting || showShopNow;
  const hasMiddleContent = showDiscount || showName || (showTimeText && Boolean(validityText));
  const hasBottomBar = showTimeCounting || showShopNow || showDiscount;

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl animate-fade-in select-none transition-all duration-500 ${
        isRemoving ? 'opacity-0 scale-95' : 'opacity-100'
      } ${className || ''}`}
      aria-label={`Offer ${index + 1} of ${total}: ${promotion.name}`}
    >
      {/* ─── Background photo (displayed at 100% natural brightness and color without dark overlays) ─── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("${bgUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />

      {/* ─── Content (if ALL six are hidden, render clean image-only banner with same height) ─── */}
      {hasAnyVisible ? (
        <div className="relative z-10 flex min-h-[420px] sm:min-h-[400px] lg:min-h-[440px] flex-col justify-between gap-6 p-6 sm:p-8 lg:p-10">
          {/* Top: offer badge */}
          {showBadge ? (
            <div>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-white/25 bg-stone-900/60 backdrop-blur-md px-3.5 py-1 text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-[#F7E6C8] shadow-sm">
                <Sparkles size={11} className="text-[#E2C299]" />
                <span>{eyebrowText}</span>
              </span>
            </div>
          ) : (
            <div aria-hidden="true" />
          )}

          {/* Middle: discount + title + description + chips with high-contrast text shadows */}
          {hasMiddleContent && (
            <div className="flex flex-col gap-3 lg:max-w-[62%]">
              {showDiscount && (
                <div className="leading-none drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]">
                  <div
                    className="font-black uppercase tracking-tight text-[#F7E6C8] whitespace-nowrap"
                    style={{
                      fontFamily: "'Anton', 'Quicksand', sans-serif",
                      fontSize: 'clamp(44px, 10vw, 76px)',
                      lineHeight: 0.92,
                      textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)',
                    }}
                  >
                    {discountParts.value}
                    {discountParts.unit}
                  </div>
                  {discountParts.label && (
                    <div
                      className="font-black uppercase tracking-tight text-[#F7E6C8]/95 whitespace-nowrap mt-0.5"
                      style={{
                        fontFamily: "'Anton', 'Quicksand', sans-serif",
                        fontSize: 'clamp(22px, 4.5vw, 36px)',
                        lineHeight: 0.92,
                        textShadow: '0 2px 6px rgba(0,0,0,0.7)',
                      }}
                    >
                      {discountParts.label}
                    </div>
                  )}
                </div>
              )}

              {showName && (
                <h3
                  className="font-heading font-bold uppercase tracking-tight text-white leading-snug line-clamp-2 break-words"
                  style={{
                    textWrap: 'balance',
                    fontSize: 'clamp(18px, 3.2vw, 28px)',
                    textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 4px 14px rgba(0,0,0,0.6)',
                  }}
                >
                  {promotion.name}
                </h3>
              )}

              {showName && promotion.description && (
                <p
                  className="text-sm text-white font-sans line-clamp-2 leading-relaxed break-words"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.6)' }}
                >
                  {promotion.description}
                </p>
              )}

              {showDiscount && (hasMaxDiscount || hasMinOrder) && (
                <div
                  className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white font-sans font-medium"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                >
                  {hasMaxDiscount && (
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <Sparkles size={12} className="text-[#E2C299] flex-shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                      <span>Up to {formatCurrency(promotion.discount.maxDiscountAmount)} off</span>
                    </div>
                  )}
                  {hasMinOrder && (
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <ShoppingBag size={12} className="text-[#E2C299] flex-shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                      <span>On orders above {formatCurrency(promotion.minimumOrderValue)}</span>
                    </div>
                  )}
                </div>
              )}

              {showTimeText && validityText && (
                <div
                  className="flex items-center gap-2 text-[13px] text-white/95 font-sans"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                >
                  <Calendar size={13} className="text-[#E2C299] flex-shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                  <span>{validityText}</span>
                </div>
              )}
            </div>
          )}

          {/* Bottom: countdown + CTA */}
          {hasBottomBar && (
            <div
              className={`flex flex-col sm:flex-row sm:items-center ${
                showTimeCounting || (showDiscount && !showTimeCounting)
                  ? 'sm:justify-between'
                  : 'sm:justify-end'
              } gap-4 p-4 sm:p-5`}
              style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
            >
              {showTimeCounting ? (
                <div className={!showDiscount ? '[&_p:last-child]:hidden' : ''}>
                  <PromotionCountdown
                    expiresAt={promotion.expiresAt}
                    startsAt={promotion.startsAt}
                    onExpire={handleExpire}
                    size="featured"
                  />
                </div>
              ) : showDiscount ? (
                <p
                  className="text-[10px] sm:text-[11px] text-[#F7E6C8]/75 font-sans"
                  style={{ textShadow: '0 1px 3px rgba(0,0,0,0.85)' }}
                >
                  Discount applied automatically at checkout
                </p>
              ) : null}

              {showShopNow && (
                <Link
                  to={ctaDestination}
                  className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 bg-[#F7E6C8] hover:bg-white active:bg-white/90 text-[#561C08] text-xs font-heading font-bold tracking-[0.2em] uppercase min-h-[44px] py-3 px-7 rounded-xl border border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:translate-y-px shadow-md"
                >
                  <span>Shop now</span>
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="min-h-[420px] sm:min-h-[400px] lg:min-h-[440px]" aria-hidden="true" />
      )}
    </div>
  );
};
