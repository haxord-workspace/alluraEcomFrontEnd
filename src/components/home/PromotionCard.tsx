import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Scissors, ShoppingBag, Sparkles } from 'lucide-react';
import type { StorePromotion } from '../../types/storePromotion';
import {
  getCtaDestination,
  getDiscountParts,
  formatValidityPeriod,
  getPromotionEyebrow,
  formatCurrency,
} from '../../utils/promotionFormat';
import { generateTicketData } from '../../utils/ticketGeometry';
import { PromotionCountdown } from './PromotionCountdown';

interface PromotionCardProps {
  promotion: StorePromotion;
  /** "featured" = wide horizontal card when space permits */
  variant: 'featured' | 'grid';
  /** Sizing/shrink classes */
  className?: string;
  animationDelayMs?: number;
  onExpire: (id: string) => void;
  index?: number;
  total?: number;
}

/** Decorative ticket-number strip — repeating-linear-gradient bars, no image assets. */
const PromoBarcode: React.FC<{ code: string }> = ({ code }) => (
  <div className="hidden lg:flex flex-col items-center gap-1" aria-hidden="true">
    <div
      className="w-[120px] h-7 rounded-[2px] opacity-55"
      style={{
        background:
          'repeating-linear-gradient(90deg, #F7E6C8 0px, #F7E6C8 1px, transparent 1px, transparent 3px, #F7E6C8 3px, #F7E6C8 5px, transparent 5px, transparent 7px, #F7E6C8 7px, #F7E6C8 8px, transparent 8px, transparent 11px)',
      }}
    />
    <span className="text-[9px] font-mono tracking-[0.2em] text-[#F7E6C8]/55 uppercase">
      {code}
    </span>
  </div>
);

// Constant clip path ID to prevent recreating SVG clipPath on promotion changes
const PERSISTENT_TICKET_CLIP_ID = 'persistent-ticket-clip-path';

export const PromotionCard: React.FC<PromotionCardProps> = ({
  promotion,
  className,
  onExpire,
  index = 0,
  total = 1,
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dividerRef = useRef<HTMLDivElement | null>(null);
  const mainPanelRef = useRef<HTMLDivElement | null>(null);

  const [dimensions, setDimensions] = useState<{
    w: number;
    h: number;
    notchX: number;
    notchY: number;
    cardSize: 'sm' | 'md' | 'lg';
  }>({
    w: 0,
    h: 0,
    notchX: 0,
    notchY: 0,
    cardSize: 'lg',
  });

  const discountParts = getDiscountParts(promotion);
  const ctaDestination = getCtaDestination(promotion);
  const validityText = formatValidityPeriod(promotion.startsAt, promotion.expiresAt);
  const eyebrowText = getPromotionEyebrow(
    promotion.startsAt,
    promotion.expiresAt,
    promotion.applicableTo?.type
  );
  const ticketCode = (promotion.id || 'ALLURA').slice(-8).toUpperCase();

  const handleExpire = React.useCallback(() => {
    setIsRemoving(true);
    window.setTimeout(() => onExpire(promotion.id), 500);
  }, [onExpire, promotion.id]);

  const hasMaxDiscount = Boolean(
    promotion.discount?.maxDiscountAmount && promotion.discount.maxDiscountAmount > 0
  );
  const hasMinOrder = Boolean(
    promotion.minimumOrderValue && promotion.minimumOrderValue > 0
  );

  // ResizeObserver to track card dimensions and determine layout by container size.
  // Note: Dependency array is empty [] so this effect runs once on mount and attaches to the persistent card DOM node.
  useEffect(() => {
    const measure = () => {
      const cardEl = cardRef.current;
      if (!cardEl) return;
      const w = cardEl.offsetWidth;
      const h = cardEl.offsetHeight;

      // Card-width based breakpoint:
      // >= 720px: wide horizontal ticket
      // 420px - 719px: medium stacked ticket
      // < 420px: small compact stacked ticket
      const cardSize: 'sm' | 'md' | 'lg' = w >= 720 ? 'lg' : w >= 420 ? 'md' : 'sm';
      const isWide = cardSize === 'lg';

      let notchX = w * 0.62;
      const notchY = Math.round(h * 0.5);

      if (isWide) {
        const stubWidth = Math.min(360, Math.max(280, w * 0.36));
        notchX = w - stubWidth;
      }

      setDimensions({ w, h, notchX, notchY, cardSize });
    };

    measure();
    const cardEl = cardRef.current;
    let ro: ResizeObserver | null = null;
    if (cardEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(measure);
      ro.observe(cardEl);
    }
    window.addEventListener('resize', measure);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const isWide = dimensions.cardSize === 'lg';
  const isCompact = dimensions.cardSize === 'sm';

  // Generate realistic scalloped ticket paths
  const ticketData = generateTicketData(dimensions.w, dimensions.h, {
    isWide,
    isCompact,
    notchX: dimensions.notchX,
    notchY: dimensions.notchY,
  });

  const notchX = dimensions.notchX || (isWide ? dimensions.w * 0.64 : dimensions.w * 0.62);
  const notchY = dimensions.notchY || dimensions.h * 0.5;

  return (
    <div
      className={`ticket-container-wrapper snap-start select-none bg-transparent ${isRemoving ? 'opacity-0 scale-95' : 'opacity-100'
        } ${className || ''} ${isWide ? 'h-[260px]' : 'h-[520px]'}`}
      data-size={dimensions.cardSize}
      style={
        {
          containerType: 'inline-size',
          containerName: 'ticket',
        } as React.CSSProperties
      }
    >
      {/* ─── LAYER 1: PERSISTENT BACKGROUND & CARD STRUCTURE ─── */}
      {/* SVG ClipPath: Full Outer Silhouette */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id={PERSISTENT_TICKET_CLIP_ID}>
            <path d={ticketData.outer} />
          </clipPath>
        </defs>
      </svg>

      <article
        ref={cardRef}
        aria-label={`Offer ${index + 1} of ${total}: ${promotion.name}`}
        className={`ticket-card-shape relative overflow-hidden flex flex-col ${isWide ? 'h-[260px]' : 'h-[520px]'
          }`}
        style={{
          clipPath: `url(#${PERSISTENT_TICKET_CLIP_ID})`,
        }}
      >
        {/* Two-Tone Panel Backgrounds: solid base (main) + deeper shade (stub) */}
        <div
          className={`absolute inset-0 flex ${isWide ? 'flex-row' : 'flex-col'}`}
          aria-hidden="true"
        >
          <div
            className="relative coupon-pattern-light"
            style={
              isWide
                ? { width: `${notchX}px`, height: '100%' }
                : { width: '100%', height: `${notchY}px` }
            }
          >
            <div className="coupon-vignette-light" />
          </div>
          <div className="relative flex-1 coupon-pattern-dark">
            <div className="coupon-vignette-dark" />
          </div>
        </div>

        {/* SVG Decorative Overlays: outer rim and gold inner stitched border */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-5"
          aria-hidden="true"
        >
          <path
            d={ticketData.outer}
            fill="none"
            stroke="#F7E6C8"
            strokeOpacity={0.26}
            strokeWidth={1.5}
          />

          {ticketData.leftEdge && (
            <>
              <path d={ticketData.leftEdge} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={4} strokeLinecap="round" />
              <path d={ticketData.leftEdge} fill="none" stroke="#F7E6C8" strokeOpacity={0.2} strokeWidth={1.5} strokeLinecap="round" />
            </>
          )}

          {ticketData.rightEdge && (
            <>
              <path d={ticketData.rightEdge} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={4} strokeLinecap="round" />
              <path d={ticketData.rightEdge} fill="none" stroke="#F7E6C8" strokeOpacity={0.2} strokeWidth={1.5} strokeLinecap="round" />
            </>
          )}

          {/* Gold inset border, following the scalloped shape */}
          <path
            d={ticketData.inner}
            fill="none"
            stroke="#C9A050"
            strokeOpacity={0.3}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>

        {/* ─── LAYER 2: DYNAMIC PROMOTION CONTENT ─── */}
        {/* Textual and dynamic content that changes per promotion without affecting the background shell */}
        <div
          className={`relative z-10 flex h-full ${isWide ? 'flex-row items-stretch' : 'flex-col justify-between'
            }`}
        >
          {/* Rotated Coupon Stub label inside scalloped edge — shown only on wide layout */}
          {isWide && (
            <div
              className="w-10 ml-3.5 border-r border-dashed border-[#F7E6C8]/20 flex flex-col items-center justify-between py-6 text-[#F7E6C8] text-[10px] font-bold tracking-[0.3em] select-none flex-shrink-0"
              aria-hidden="true"
            >
              <span className="text-xs text-[#F7E6C8]/60">✦</span>
              <span className="[writing-mode:vertical-rl] rotate-180 uppercase font-heading font-bold text-[#F7E6C8]/80">
                COUPON PASS
              </span>
              <span className="text-xs text-[#F7E6C8]/60">✦</span>
            </div>
          )}

          {/* ─── MAIN TICKET PANEL ─── */}
          <div
            ref={mainPanelRef}
            className={`relative flex-1 ${isWide
              ? 'px-7 py-6 flex items-center justify-between gap-6 min-w-0 h-full'
              : 'p-5 sm:p-6 flex flex-col justify-between min-w-0 h-1/2'
              }`}
          >
            {isWide ? (
              /* WIDE BALANCED LAYOUT (Card width >= 720px) */
              <>
                {/* Left Block: Eyebrow + Poster-style discount */}
                <div key={`left-${promotion.id}`} className="promo-content-transition flex flex-col justify-center space-y-3 flex-shrink-0">
                  <div>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-[#F7E6C8] bg-[#F7E6C8]/10 px-3 py-1 rounded-full border border-[#F7E6C8]/25">
                      <Sparkles size={11} className="text-[#C9A050]" />
                      <span className="whitespace-nowrap">{eyebrowText}</span>
                    </span>
                  </div>

                  <div className="leading-none">
                    <div
                      className="promo-value-shadow font-black text-[#F7E6C8] uppercase tracking-tight whitespace-nowrap"
                      style={{
                        fontFamily: "'Anton', 'Quicksand', sans-serif",
                        fontSize: 'clamp(52px, 6.2cqi, 80px)',
                        lineHeight: 0.92,
                      }}
                    >
                      {discountParts.value}
                      {discountParts.unit}
                    </div>
                    {discountParts.label && (
                      <div
                        className="promo-off-outline font-black uppercase tracking-tight whitespace-nowrap mt-0.5"
                        style={{
                          fontFamily: "'Anton', 'Quicksand', sans-serif",
                          fontSize: 'clamp(26px, 3.2cqi, 40px)',
                          lineHeight: 0.92,
                        }}
                      >
                        {discountParts.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vertical Center Diamond Divider (Persistent) */}
                <div
                  className="h-28 w-[1px] bg-[#F7E6C8]/20 relative flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <span className="text-[10px] text-[#C9A050] bg-[#561C08] px-0.5">◆</span>
                </div>

                {/* Right Block: Title, description, info chips, validity */}
                <div key={`right-${promotion.id}`} className="promo-content-transition flex-1 flex flex-col justify-center space-y-2 min-w-0 pr-2">
                  <h3
                    className="font-heading font-bold uppercase tracking-tight text-[#F7E6C8] leading-snug line-clamp-2 break-words"
                    style={{ textWrap: 'balance', fontSize: 'clamp(18px, 2.5cqi, 26px)' }}
                  >
                    {promotion.name}
                  </h3>

                  {promotion.description && (
                    <p className="text-[13px] text-[#F7E6C8]/80 font-sans line-clamp-2 leading-relaxed break-words">
                      {promotion.description}
                    </p>
                  )}

                  {(hasMaxDiscount || hasMinOrder) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[#F7E6C8]/85 font-sans font-medium">
                      {hasMaxDiscount && (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Sparkles size={12} className="text-[#C9A050] flex-shrink-0" />
                          <span>Up to {formatCurrency(promotion.discount.maxDiscountAmount)} off</span>
                        </div>
                      )}
                      {hasMinOrder && (
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <ShoppingBag size={12} className="text-[#C9A050] flex-shrink-0" />
                          <span>On orders above {formatCurrency(promotion.minimumOrderValue)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {validityText && (
                    <div className="flex items-center gap-2 text-[13px] text-[#F7E6C8]/85 font-sans whitespace-nowrap">
                      <Calendar size={13} className="text-[#C9A050] flex-shrink-0" />
                      <span>{validityText}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* STACKED COMPACT LAYOUT (Card width < 720px) */
              <div key={`stacked-${promotion.id}`} className="promo-content-transition flex flex-col justify-between h-full">
                {/* Top Row: Discount on left, Limited Offer badge neatly on top-right */}
                <div className="flex items-start justify-between gap-2">
                  <div className="leading-none flex-1 min-w-0">
                    <div
                      className="promo-value-shadow font-black text-[#F7E6C8] uppercase tracking-tight whitespace-nowrap"
                      style={{
                        fontFamily: "'Anton', 'Quicksand', sans-serif",
                        fontSize: 'clamp(46px, 15cqi, 68px)',
                        lineHeight: 0.88,
                      }}
                    >
                      {discountParts.value}
                      {discountParts.unit}
                    </div>
                    {discountParts.label && (
                      <div
                        className="promo-off-outline font-black uppercase tracking-tight whitespace-nowrap mt-0.5"
                        style={{
                          fontFamily: "'Anton', 'Quicksand', sans-serif",
                          fontSize: 'clamp(23px, 7.5cqi, 36px)',
                          lineHeight: 0.9,
                        }}
                      >
                        {discountParts.label}
                      </div>
                    )}
                  </div>

                  {/* Limited Offer Badge: Positioned top-right on mobile */}
                  <div className="flex-shrink-0 pt-0.5">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-[#F7E6C8] bg-[#F7E6C8]/10 px-2.5 py-0.5 rounded-full border border-[#F7E6C8]/25 shadow-xs">
                      <Sparkles size={11} className="text-[#C9A050]" />
                      <span className="whitespace-nowrap">{eyebrowText}</span>
                    </span>
                  </div>
                </div>

                <div className="my-auto py-1">
                  <h3
                    className="font-heading font-bold uppercase tracking-tight text-[#F7E6C8] leading-snug line-clamp-2 break-words min-h-[2.5rem] flex items-center"
                    style={{ textWrap: 'balance', fontSize: 'clamp(15px, 3.8cqi, 19px)' }}
                  >
                    {promotion.name}
                  </h3>

                  <div className="flex items-center gap-2 w-full my-1" aria-hidden="true">
                    <div className="flex-1 h-[1px] bg-[#F7E6C8]/20" />
                    <span className="text-[10px] text-[#C9A050]">◆</span>
                    <div className="flex-1 h-[1px] bg-[#F7E6C8]/20" />
                  </div>
                </div>

                <div className="space-y-1 min-h-[2.25rem] flex flex-col justify-end">
                  {promotion.description ? (
                    <p className="text-xs text-[#F7E6C8]/80 font-sans line-clamp-1 leading-relaxed break-words">
                      {promotion.description}
                    </p>
                  ) : (hasMaxDiscount || hasMinOrder) ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#F7E6C8]/85 font-sans font-medium line-clamp-1">
                      {hasMaxDiscount && <span>Up to {formatCurrency(promotion.discount.maxDiscountAmount)} off</span>}
                      {hasMinOrder && <span>Above {formatCurrency(promotion.minimumOrderValue)}</span>}
                    </div>
                  ) : null}

                  {validityText && (
                    <div className="flex items-center gap-1.5 text-xs text-[#F7E6C8]/85 font-sans truncate">
                      <Calendar size={12} className="text-[#C9A050] flex-shrink-0" />
                      <span className="truncate">{validityText}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ─── PUNCHED PERFORATION DIVIDER LINE ─── */}
          <div
            ref={dividerRef}
            className={`relative ${isWide
              ? 'ticket-punched-divider-vertical h-auto'
              : 'ticket-punched-divider-horizontal w-full'
              }`}
            aria-hidden="true"
          >
            <Scissors
              aria-hidden="true"
              className={
                isWide
                  ? 'absolute -left-[9px] top-5 text-[#C9A050] rotate-90'
                  : 'absolute left-4 -top-[9px] text-[#C9A050]'
              }
              size={14}
              strokeWidth={1.75}
            />
          </div>

          {/* ─── STUB PANEL ─── */}
          <div
            className={`p-5 sm:p-6 flex flex-col items-center justify-between text-center bg-transparent text-white ${isWide ? 'flex-shrink-0 h-full' : 'w-full h-1/2 flex-shrink-0'
              }`}
            style={isWide ? { width: `clamp(280px, 36%, 360px)` } : undefined}
          >
            {/* Countdown Segmented Timer — updates its target time dynamically without remounting */}
            <div className="w-full">
              <PromotionCountdown
                expiresAt={promotion.expiresAt}
                startsAt={promotion.startsAt}
                onExpire={handleExpire}
                size={isWide ? 'featured' : 'compact'}
              />
            </div>

            {/* Decorative ticket-number barcode — wide layout only */}
            {isWide && (
              <div key={`barcode-${promotion.id}`} className="promo-content-transition">
                <PromoBarcode code={ticketCode} />
              </div>
            )}

            {/* Primary Action Button (full width of stub, min 44px tap target) */}
            <div className="w-full pt-1">
              <Link
                to={ctaDestination}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#F7E6C8] hover:bg-white active:bg-white/90 text-[#561C08] text-xs font-heading font-bold tracking-[0.2em] uppercase min-h-[44px] py-3 px-6 rounded-xl border border-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:translate-y-px shadow-sm"
              >
                <span>Shop now</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};
