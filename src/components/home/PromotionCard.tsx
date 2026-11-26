import React, { useRef, useState, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Scissors, ShoppingBag, Sparkles, Tag } from 'lucide-react';
import type { StorePromotion } from '../../types/storePromotion';
import {
  getApplicableGroups,
  getCtaDestination,
  getDiscountParts,
  formatValidityPeriod,
  getPromotionEyebrow,
  formatCurrency,
} from '../../utils/promotionFormat';
import { generateTicketData } from '../../utils/ticketGeometry';
import { PromotionCountdown } from './PromotionCountdown';

const MAX_CHIPS_PER_GROUP = 3;

interface PromotionCardProps {
  promotion: StorePromotion;
  /** "featured" = wide horizontal card when space permits */
  variant: 'featured' | 'grid';
  /** Sizing/shrink classes */
  className?: string;
  animationDelayMs: number;
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

export const PromotionCard: React.FC<PromotionCardProps> = ({
  promotion,
  className,
  animationDelayMs,
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

  const rawClipId = useId();
  const baseId = rawClipId.replace(/:/g, '');
  const clipId = `ticket-clip-${promotion.id}-${baseId}`;

  const discountParts = getDiscountParts(promotion);
  const applicableGroups = getApplicableGroups(promotion);
  const ctaDestination = getCtaDestination(promotion);
  const validityText = formatValidityPeriod(promotion.startsAt, promotion.expiresAt);
  const eyebrowText = getPromotionEyebrow(promotion.startsAt, promotion.expiresAt);
  const ticketCode = promotion.id.slice(-8).toUpperCase();

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

  // ResizeObserver to track card dimensions and determine layout by container size
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
  }, [promotion]);

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
      className={`ticket-container-wrapper ticket-drop-shadow-wrapper snap-start select-none ${
        isRemoving ? 'opacity-0 scale-95' : 'opacity-100'
      } ${className || ''} ${isWide ? 'h-[260px]' : 'h-[520px]'}`}
      data-size={dimensions.cardSize}
      style={
        {
          containerType: 'inline-size',
          containerName: 'ticket',
          animationDelay: `${animationDelayMs}ms`,
        } as React.CSSProperties
      }
    >
      {/* SVG ClipPath: Full Outer Silhouette */}
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <path d={ticketData.outer} />
          </clipPath>
        </defs>
      </svg>

      <article
        ref={cardRef}
        aria-label={`Offer ${index + 1} of ${total}: ${promotion.name}`}
        className={`ticket-card-shape relative overflow-hidden flex flex-col ${
          isWide ? 'h-[260px]' : 'h-[520px]'
        }`}
        style={{
          clipPath: `url(#${clipId})`,
        }}
      >
        {/* Two-Tone Panel Backgrounds: solid base (main) + deeper shade (stub), each with a quiet geometric pattern band */}
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

        {/* SVG Decorative Overlays: unified outer perimeter border, edge thickness/rim, and gold inner stitched border */}
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

        {/* ─── CARD CONTENT ─── */}
        <div
          className={`relative z-10 flex h-full ${
            isWide ? 'flex-row items-stretch' : 'flex-col justify-between'
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
            className={`relative flex-1 ${
              isWide
                ? 'px-7 py-6 flex items-center justify-between gap-6 min-w-0 h-full'
                : 'p-5 sm:p-6 flex flex-col justify-between min-w-0 h-1/2'
            }`}
          >
            {isWide ? (
              /* WIDE BALANCED LAYOUT (Card width >= 720px) */
              <>
                {/* Left Block: Eyebrow + Poster-style discount */}
                <div className="flex flex-col justify-center space-y-3 flex-shrink-0">
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
                        fontSize: 'clamp(44px, 5.5cqi, 72px)',
                        lineHeight: 0.92,
                      }}
                    >
                      {discountParts.value}
                      {discountParts.unit}
                    </div>
                    {discountParts.label && (
                      <div
                        className="promo-off-outline font-black uppercase tracking-tight whitespace-nowrap"
                        style={{
                          fontFamily: "'Anton', 'Quicksand', sans-serif",
                          fontSize: 'clamp(22px, 2.8cqi, 36px)',
                          lineHeight: 0.92,
                        }}
                      >
                        {discountParts.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vertical Center Diamond Divider */}
                <div
                  className="h-28 w-[1px] bg-[#F7E6C8]/20 relative flex items-center justify-center flex-shrink-0"
                  aria-hidden="true"
                >
                  <span className="text-[10px] text-[#C9A050] bg-[#561C08] px-0.5">◆</span>
                </div>

                {/* Right Block: Title, description, info chips, validity */}
                <div className="flex-1 flex flex-col justify-center space-y-2 min-w-0 pr-2">
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
              <>
                <div className="space-y-1.5">
                  <div>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-[#F7E6C8] bg-[#F7E6C8]/10 px-2.5 py-0.5 rounded-full border border-[#F7E6C8]/25">
                      <Sparkles size={11} className="text-[#C9A050]" />
                      <span className="whitespace-nowrap">{eyebrowText}</span>
                    </span>
                  </div>

                  <div className="leading-none">
                    <div
                      className="promo-value-shadow font-black text-[#F7E6C8] uppercase tracking-tight whitespace-nowrap"
                      style={{
                        fontFamily: "'Anton', 'Quicksand', sans-serif",
                        fontSize: 'clamp(40px, 14cqi, 60px)',
                        lineHeight: 0.88,
                      }}
                    >
                      {discountParts.value}
                      {discountParts.unit}
                    </div>
                    {discountParts.label && (
                      <div
                        className="promo-off-outline font-black uppercase tracking-tight whitespace-nowrap"
                        style={{
                          fontFamily: "'Anton', 'Quicksand', sans-serif",
                          fontSize: 'clamp(20px, 7cqi, 32px)',
                          lineHeight: 0.9,
                        }}
                      >
                        {discountParts.label}
                      </div>
                    )}
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
              </>
            )}
          </div>

          {/* ─── PUNCHED PERFORATION DIVIDER LINE ─── */}
          <div
            ref={dividerRef}
            className={`relative ${
              isWide
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
            className={`p-5 sm:p-6 flex flex-col items-center justify-between text-center bg-transparent text-white ${
              isWide ? 'flex-shrink-0 h-full' : 'w-full h-1/2 flex-shrink-0'
            }`}
            style={isWide ? { width: `clamp(280px, 36%, 360px)` } : undefined}
          >
            {/* Countdown Segmented Timer */}
            <div className="w-full">
              <PromotionCountdown
                expiresAt={promotion.expiresAt}
                startsAt={promotion.startsAt}
                onExpire={handleExpire}
                size={isWide ? 'featured' : 'compact'}
              />
            </div>

            {/* Eligible Items Chips */}
            <div className="w-full space-y-1 my-auto">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-[#E2C299]">
                <Tag size={11} className="text-[#E2C299]" />
                <span className="gold-foil-text font-bold">Eligible Items</span>
              </div>

              {applicableGroups.map((group) => (
                <div key={group.kind} className="w-full">
                  {group.items.length === 0 ? (
                    <span className="inline-flex items-center text-xs font-sans px-3 py-1 rounded-full border bg-[#6E2C10]/35 border-[#F7E6C8]/45 text-[#F7E6C8]">
                      Sitewide: all products
                    </span>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-1.5 max-h-[3rem] overflow-hidden">
                      {group.items.slice(0, MAX_CHIPS_PER_GROUP).map((item) =>
                        item.href ? (
                          <Link
                            key={item.id}
                            to={item.href}
                            className="inline-flex items-center max-w-[12rem] truncate text-xs font-sans px-2.5 py-1 rounded-full border bg-[#6E2C10]/35 border-[#F7E6C8]/45 text-[#F7E6C8] active:bg-[#6E2C10]/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 min-h-[32px]"
                          >
                            <span className="truncate">{item.name}</span>
                          </Link>
                        ) : (
                          <span
                            key={item.id}
                            className="inline-flex items-center max-w-[12rem] truncate text-xs font-sans px-2.5 py-1 rounded-full border bg-[#6E2C10]/20 border-[#F7E6C8]/30 text-[#F7E6C8]/80 cursor-default min-h-[32px]"
                          >
                            <span className="truncate">{item.name}</span>
                          </span>
                        )
                      )}
                      {group.items.length > MAX_CHIPS_PER_GROUP && (
                        <span className="inline-flex items-center text-xs font-sans px-2 py-0.5 rounded-full border bg-[#6E2C10]/20 border-[#F7E6C8]/30 text-[#F7E6C8]/70 cursor-default">
                          +{group.items.length - MAX_CHIPS_PER_GROUP} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Decorative ticket-number barcode — wide layout only */}
            {isWide && <PromoBarcode code={ticketCode} />}

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
