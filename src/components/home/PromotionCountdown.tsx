import React from 'react';
import { Clock } from 'lucide-react';
import { useCountdown } from '../../hooks/useCountdown';

interface PromotionCountdownProps {
  expiresAt: string;
  startsAt?: string;
  onExpire: () => void;
  size?: 'featured' | 'compact';
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Isolated countdown component with printed paper tab pills and high-contrast crimson digits.
 */
export const PromotionCountdown: React.FC<PromotionCountdownProps> = React.memo(
  ({ expiresAt, startsAt, onExpire, size = 'featured' }) => {
    const countdown = useCountdown(expiresAt);

    React.useEffect(() => {
      if (countdown.isExpired) onExpire();
    }, [countdown.isExpired, onExpire]);

    const isUpcoming = startsAt ? Date.now() < new Date(startsAt).getTime() : false;
    const isFeatured = size === 'featured';

    const pillClass = isFeatured
      ? 'w-13 sm:w-16 h-12 sm:h-14 rounded-xl sm:rounded-2xl'
      : 'w-11 sm:w-13 h-10 sm:h-12 rounded-lg sm:rounded-xl';

    const numClass = isFeatured
      ? 'text-lg sm:text-2xl font-heading font-bold'
      : 'text-base sm:text-lg font-heading font-bold';

    const labelClass = isFeatured
      ? 'text-[9px] sm:text-[10px] font-sans font-bold uppercase tracking-widest text-[#F7E6C8]/80 mt-1'
      : 'text-[8px] sm:text-[9px] font-sans font-bold uppercase tracking-wider text-[#F7E6C8]/80 mt-0.5';

    // Elapsed progress calculation
    const elapsedPercent = React.useMemo(() => {
      if (!startsAt || !expiresAt) return null;
      const start = new Date(startsAt).getTime();
      const end = new Date(expiresAt).getTime();
      const total = end - start;
      if (total <= 0 || Number.isNaN(total)) return null;
      const elapsed = Date.now() - start;
      return Math.min(100, Math.max(0, (elapsed / total) * 100));
    }, [startsAt, expiresAt, countdown.remainingMs]);

    return (
      <div
        className={`flex flex-col items-center justify-center text-center w-full ${
          countdown.isLastHour ? 'promo-countdown-pulse' : ''
        }`}
        aria-label={countdown.ariaLabel}
        aria-live="off"
      >
        {/* Header label */}
        <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-sans font-semibold tracking-wider uppercase text-[#F7E6C8] mb-2 sm:mb-2.5">
          <Clock size={13} className="text-[#E2C299]" aria-hidden="true" />
          <span>{isUpcoming ? 'Offer starts in' : 'Offer ends in'}</span>
        </div>

        {/* Segmented timer pills with subtle inner shadow & bottom highlight */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <div
              className={`${pillClass} bg-[#F7E6C8] ticket-timer-pill border border-amber-200/70 flex items-center justify-center`}
            >
              <span
                className={`${numClass} text-[#8B1A1A] tabular-nums`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {pad(countdown.hours)}
              </span>
            </div>
            <span className={labelClass}>Hours</span>
          </div>

          <span className="text-base sm:text-xl font-bold text-[#F7E6C8]/60 font-heading -mt-3.5 sm:-mt-4">
            :
          </span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <div
              className={`${pillClass} bg-[#F7E6C8] ticket-timer-pill border border-amber-200/70 flex items-center justify-center`}
            >
              <span
                className={`${numClass} text-[#8B1A1A] tabular-nums`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {pad(countdown.minutes)}
              </span>
            </div>
            <span className={labelClass}>Mins</span>
          </div>

          <span className="text-base sm:text-xl font-bold text-[#F7E6C8]/60 font-heading -mt-3.5 sm:-mt-4">
            :
          </span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <div
              className={`${pillClass} bg-[#F7E6C8] ticket-timer-pill border border-amber-200/70 flex items-center justify-center`}
            >
              <span
                className={`${numClass} text-[#8B1A1A] tabular-nums`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {pad(countdown.seconds)}
              </span>
            </div>
            <span className={labelClass}>Secs</span>
          </div>
        </div>

        {/* Elapsed progress bar */}
        {elapsedPercent !== null && !isUpcoming && (
          <div className="w-full max-w-[190px] sm:max-w-[210px] mt-2.5" aria-hidden="true">
            <div className="h-1 rounded-full bg-black/25 overflow-hidden border border-white/10">
              <div
                className="h-full bg-gradient-to-r from-[#E2C299] to-red-400 rounded-full"
                style={{ width: `${elapsedPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Automatic checkout note */}
        <p className="text-[10px] sm:text-[11px] text-[#F7E6C8]/75 font-sans mt-2">
          Discount applied automatically at checkout
        </p>
      </div>
    );
  }
);

PromotionCountdown.displayName = 'PromotionCountdown';
