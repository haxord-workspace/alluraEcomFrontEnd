import React, { memo } from 'react';
import { BadgeCheck, Camera } from 'lucide-react';
import { StarRatingDisplay } from './StarRating';
import { pluralizeReviews } from '../../utils/reviewFormat';
import { REVIEW_RATINGS } from '../../types/reviews';
import type { ReviewRating, ReviewSummary } from '../../types/reviews';

interface ReviewSummaryPanelProps {
  summary: ReviewSummary;
  activeRating?: ReviewRating;
  /** Clicking a distribution bar filters the list to that rating (click again to clear) */
  onSelectRating: (rating: ReviewRating | undefined) => void;
}

export const ReviewSummaryPanel: React.FC<ReviewSummaryPanelProps> = memo(({ summary, activeRating, onSelectRating }) => {
  const { averageRating, reviewCount, distribution, verifiedPurchasePercentage, reviewsWithImagesCount } = summary;
  const hasReviews = reviewCount > 0;

  return (
    <div className="bg-allura-card border border-allura-border rounded-2xl p-5 sm:p-6 shadow-subtle space-y-5">
      {hasReviews ? (
        <div className="flex items-end gap-3">
          <span className="font-serif text-4xl font-semibold text-allura-darkBrown leading-none">{averageRating.toFixed(1)}</span>
          <div className="space-y-1 pb-0.5">
            <StarRatingDisplay rating={averageRating} size={16} />
            <p className="text-xs font-sans text-allura-muted">Based on {pluralizeReviews(reviewCount)}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="font-serif text-lg text-allura-text">No reviews yet</p>
          <p className="text-xs font-sans text-allura-muted">Be the first to share how this piece looks and fits.</p>
        </div>
      )}

      {hasReviews && (
        <div className="space-y-1.5" role="group" aria-label="Filter reviews by star rating">
          {REVIEW_RATINGS.map(star => {
            const count = distribution[star];
            const pct = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
            const isActive = activeRating === star;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onSelectRating(isActive ? undefined : star)}
                disabled={count === 0 && !isActive}
                aria-pressed={isActive}
                aria-label={`${star} star: ${count} ${count === 1 ? 'review' : 'reviews'}${isActive ? ' (filter on)' : ''}`}
                className={`w-full grid grid-cols-[2.25rem_1fr_2.5rem] items-center gap-2 min-h-11 sm:min-h-8 px-1.5 rounded-lg text-xs font-sans transition-colors disabled:cursor-default disabled:opacity-60 ${
                  isActive ? 'bg-allura-bg/70' : 'enabled:hover:bg-allura-bg/40'
                }`}
              >
                <span className="text-allura-text font-semibold text-left">{star} ★</span>
                <span className="h-2 rounded-full bg-stone-200 overflow-hidden" aria-hidden="true">
                  <span className="block h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                </span>
                <span className="text-allura-muted text-right tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {hasReviews && (
        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-sans text-allura-muted">
          <div className="flex items-center gap-1.5 bg-allura-bg/40 border border-allura-border/70 rounded-xl p-2.5">
            <BadgeCheck size={14} className="text-emerald-700 flex-shrink-0" />
            <span>
              <strong className="text-allura-text">{verifiedPurchasePercentage}%</strong> verified purchases
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-allura-bg/40 border border-allura-border/70 rounded-xl p-2.5">
            <Camera size={14} className="text-allura-goldDark flex-shrink-0" />
            <span>
              <strong className="text-allura-text">{reviewsWithImagesCount}</strong> with photos
            </span>
          </div>
        </div>
      )}
    </div>
  );
});
ReviewSummaryPanel.displayName = 'ReviewSummaryPanel';
