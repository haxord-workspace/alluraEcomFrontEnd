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
 * Reserves the exact footprint of `PremiumBackgroundCard` (full-bleed on desktop, same
 * min-heights) so swapping to the real card never shifts layout. Shown only for the brief
 * window before the background-image probe resolves — never the no-image ticket design.
 */
const BackgroundCardSkeleton: React.FC = () => (
  <div
    className="relative w-full overflow-hidden bg-[#561C08]/10 allura-shimmer lg:w-screen lg:max-w-none lg:ml-[calc(50%-50vw)] lg:mr-[calc(50%-50vw)] min-h-[420px] sm:min-h-[400px] lg:min-h-[440px]"
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

  return (
    <div
      className={`relative w-full overflow-hidden rounded-none shadow-xl animate-fade-in select-none transition-all duration-500 lg:w-screen lg:max-w-none lg:ml-[calc(50%-50vw)] lg:mr-[calc(50%-50vw)] ${
        isRemoving ? 'opacity-0 scale-95' : 'opacity-100'
      } ${className || ''}`}
      aria-label={`Offer ${index + 1} of ${total}: ${promotion.name}`}
    >
      {/* ─── Background photo ─── */}
      <div
        className="absolute inset-0 bg-stone-900"
        style={{
          backgroundImage: `url("${bgUrl}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        aria-hidden="true"
      />
      {/* Dark gradient overlay for text readability */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10 lg:bg-gradient-to-r lg:from-black/80 lg:via-black/40 lg:to-black/10"
        aria-hidden="true"
      />

      {/* ─── Content ─── */}
      <div className="relative z-10 flex min-h-[420px] sm:min-h-[400px] lg:min-h-[440px] flex-col justify-between gap-6 p-6 sm:p-8 lg:p-10">
        {/* Top: offer badge */}
        <div>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-[#F7E6C8]/30 bg-white/10 px-3 py-1 text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-[#F7E6C8] backdrop-blur-sm">
            <Sparkles size={11} className="text-[#E2C299]" />
            <span>{eyebrowText}</span>
          </span>
        </div>

        {/* Middle: discount + title + description + chips */}
        <div className="flex flex-col gap-3 lg:max-w-[62%]">
          <div className="leading-none drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]">
            <div
              className="font-black uppercase tracking-tight text-[#F7E6C8] whitespace-nowrap"
              style={{
                fontFamily: "'Anton', 'Quicksand', sans-serif",
                fontSize: 'clamp(44px, 10vw, 76px)',
                lineHeight: 0.92,
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
                }}
              >
                {discountParts.label}
              </div>
            )}
          </div>

          <h3
            className="font-heading font-bold uppercase tracking-tight text-white leading-snug line-clamp-2 break-words"
            style={{ textWrap: 'balance', fontSize: 'clamp(18px, 3.2vw, 28px)' }}
          >
            {promotion.name}
          </h3>

          {promotion.description && (
            <p className="text-sm text-white/85 font-sans line-clamp-2 leading-relaxed break-words">
              {promotion.description}
            </p>
          )}

          {(hasMaxDiscount || hasMinOrder) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white/90 font-sans font-medium">
              {hasMaxDiscount && (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <Sparkles size={12} className="text-[#E2C299] flex-shrink-0" />
                  <span>Up to {formatCurrency(promotion.discount.maxDiscountAmount)} off</span>
                </div>
              )}
              {hasMinOrder && (
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <ShoppingBag size={12} className="text-[#E2C299] flex-shrink-0" />
                  <span>On orders above {formatCurrency(promotion.minimumOrderValue)}</span>
                </div>
              )}
            </div>
          )}

          {validityText && (
            <div className="flex items-center gap-2 text-[13px] text-white/85 font-sans">
              <Calendar size={13} className="text-[#E2C299] flex-shrink-0" />
              <span>{validityText}</span>
            </div>
          )}
        </div>

        {/* Bottom: countdown + CTA. Fully transparent at every breakpoint — the banner
            image stays visible directly behind the countdown; only spacing, no panel. */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5">
          <PromotionCountdown
            expiresAt={promotion.expiresAt}
            startsAt={promotion.startsAt}
            onExpire={handleExpire}
            size="featured"
          />

          <Link
            to={ctaDestination}
            className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center gap-2 bg-[#F7E6C8] hover:bg-white active:bg-white/90 text-[#561C08] text-xs font-heading font-bold tracking-[0.2em] uppercase min-h-[44px] py-3 px-7 rounded-xl border border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:translate-y-px shadow-sm"
          >
            <span>Shop now</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};
