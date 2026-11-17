import React, { memo, useRef, useState } from 'react';
import { Star } from 'lucide-react';

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  onBlur?: () => void;
  labelId: string;
  errorId?: string;
  invalid?: boolean;
  disabled?: boolean;
}

/**
 * Required star picker. ARIA radiogroup with roving tabindex:
 * Tab focuses the group, ←/→ (or ↑/↓) change the rating, Home/End jump, Space/Enter select.
 */
export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  onBlur,
  labelId,
  errorId,
  invalid,
  disabled,
}) => {
  const [hover, setHover] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const shown = hover || value;

  const select = (next: number) => {
    const clamped = Math.min(5, Math.max(1, next));
    onChange(clamped);
    buttons.current[clamped - 1]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const current = value || 0;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') select(current + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') select(current - 1 || 1);
    else if (e.key === 'Home') select(1);
    else if (e.key === 'End') select(5);
    else return;
    e.preventDefault();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-required="true"
        aria-invalid={invalid || undefined}
        aria-describedby={errorId}
        onKeyDown={onKeyDown}
        onMouseLeave={() => setHover(0)}
        onBlur={e => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onBlur?.();
        }}
        className="flex items-center"
      >
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            ref={el => {
              buttons.current[star - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? '' : 's'}, ${RATING_WORDS[star]}`}
            tabIndex={value ? (value === star ? 0 : -1) : star === 1 ? 0 : -1}
            disabled={disabled}
            data-autofocus={(value ? value === star : star === 1) || undefined}
            onClick={() => select(star)}
            onMouseEnter={() => setHover(star)}
            className="w-11 h-11 flex items-center justify-center rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-allura-gold disabled:opacity-50"
          >
            <Star
              size={28}
              className={star <= shown ? 'text-amber-500 fill-current' : 'text-amber-500/40'}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <span className="text-xs font-sans font-semibold text-allura-muted min-w-[5rem]" aria-hidden="true">
        {RATING_WORDS[shown] || 'Tap to rate'}
      </span>
    </div>
  );
};

interface StarRatingDisplayProps {
  /** 0–5, fractional values are drawn as partially filled stars */
  rating: number;
  size?: number;
  className?: string;
}

/** Read-only star rating. Announced to screen readers as "Rated x out of 5". */
export const StarRatingDisplay: React.FC<StarRatingDisplayProps> = memo(({ rating, size = 14, className = '' }) => {
  const value = Math.min(5, Math.max(0, Number.isFinite(rating) ? rating : 0));
  return (
    <span
      role="img"
      aria-label={`Rated ${Math.round(value * 10) / 10} out of 5`}
      className={`inline-flex items-center gap-0.5 ${className}`}
    >
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.min(1, Math.max(0, value - i));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }} aria-hidden="true">
            <Star size={size} className="absolute inset-0 text-amber-500/30" />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="text-amber-500 fill-current" />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
});
StarRatingDisplay.displayName = 'StarRatingDisplay';
