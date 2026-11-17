import React, { memo, useState } from 'react';
import { BadgeCheck, Flag, Loader2, ThumbsUp } from 'lucide-react';
import { StarRatingDisplay } from './StarRating';
import { useReviewVote } from '../../hooks/useReviewVote';
import { formatReviewDate, getReviewerInitials } from '../../utils/reviewFormat';
import type { PublicReview, ReviewApiError, ReviewImage } from '../../types/reviews';

const LONG_COMMENT = 420;

interface ReviewCardProps {
  review: PublicReview;
  /** The signed-in customer wrote this review: vote / report are disabled */
  isOwn?: boolean;
  /** Returns false (and prompts sign-in) when the visitor is not signed in */
  ensureSignedIn: (purpose: 'vote' | 'report') => boolean;
  onOpenImage: (images: ReviewImage[], index: number) => void;
  onReport: (reviewId: string) => void;
  onVoteResult: (result: { voted: boolean } | { error: ReviewApiError }) => void;
  /** Slot for own-review shortcuts (Edit / Delete), added in a later phase */
  ownActions?: React.ReactNode;
}

/** One approved review. All text is rendered as plain React text. */
export const ReviewCard: React.FC<ReviewCardProps> = memo(
  ({ review, isOwn = false, ensureSignedIn, onOpenImage, onReport, onVoteResult, ownActions }) => {
    const { voted, helpfulCount, isVoting, toggle } = useReviewVote(review.id, review.helpfulCount);
    const [expanded, setExpanded] = useState(false);
    const name = review.reviewerName || 'Customer';
    const date = formatReviewDate(review.createdAt);
    const isLong = review.comment.length > LONG_COMMENT;
    const comment = isLong && !expanded ? `${review.comment.slice(0, LONG_COMMENT).trimEnd()}…` : review.comment;

    const handleVote = async () => {
      if (isOwn || !ensureSignedIn('vote')) return;
      const outcome = await toggle();
      if (!outcome) return;
      // useReviewVote has already applied the server's state (or rolled back)
      onVoteResult('error' in outcome ? { error: outcome.error } : { voted: outcome.result.voted });
    };

    return (
      <article className="bg-allura-card border border-allura-border rounded-2xl p-5 shadow-subtle space-y-3" aria-label={`Review by ${name}`}>
        <header className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-10 h-10 rounded-full bg-allura-bg text-allura-darkBrown border border-allura-border flex items-center justify-center text-xs font-sans font-bold flex-shrink-0"
              aria-hidden="true"
            >
              {getReviewerInitials(review.reviewerName)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-sans font-semibold text-allura-text truncate">
                {name}
                {isOwn && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-allura-goldDark">Your review</span>}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-sans text-allura-muted">
                <StarRatingDisplay rating={review.rating} size={12} />
                {date && <time dateTime={review.createdAt || undefined}>{date}</time>}
              </div>
            </div>
          </div>
          {review.isVerifiedPurchase && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-sans font-bold uppercase tracking-wider flex-shrink-0">
              <BadgeCheck size={12} />
              <span>Verified Purchase</span>
            </span>
          )}
        </header>

        {review.title && <h3 className="font-serif text-base text-allura-text font-semibold break-words">{review.title}</h3>}
        {review.comment && (
          <p className="text-xs sm:text-sm font-sans text-allura-text/80 leading-relaxed whitespace-pre-line break-words">
            {comment}
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="ml-1 font-bold text-allura-goldDark hover:underline"
                aria-expanded={expanded}
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </p>
        )}

        {review.images.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Review photos">
            {review.images.map((img, idx) => (
              <li key={`${img.url}-${idx}`}>
                <button
                  type="button"
                  onClick={() => onOpenImage(review.images, idx)}
                  className="block w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-allura-border bg-allura-bg focus:outline-none focus:ring-2 focus:ring-allura-gold"
                  aria-label={`Open photo ${idx + 1} of ${review.images.length}`}
                >
                  <img
                    src={img.thumbnailUrl}
                    alt={img.alt || `Photo ${idx + 1} from ${name}'s review`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}

        {review.adminResponse && (
          <div className="bg-allura-bg/50 border border-allura-border rounded-xl p-3.5 space-y-1">
            <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-allura-goldDark">
              Response from Allura
              {review.adminResponse.respondedAt && (
                <span className="ml-2 font-normal normal-case tracking-normal text-allura-muted">
                  {formatReviewDate(review.adminResponse.respondedAt)}
                </span>
              )}
            </p>
            <p className="text-xs font-sans text-allura-text/80 leading-relaxed whitespace-pre-line break-words">
              {review.adminResponse.message}
            </p>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleVote}
              disabled={isOwn || isVoting}
              aria-pressed={voted}
              title={isOwn ? "You can't vote on your own review" : undefined}
              className={`inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl border text-xs font-sans font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                voted
                  ? 'bg-allura-darkBrown text-white border-allura-darkBrown'
                  : 'border-allura-border text-allura-text hover:bg-allura-bg/60'
              }`}
            >
              {isVoting ? <Loader2 size={13} className="animate-spin" /> : <ThumbsUp size={13} className={voted ? 'fill-current' : ''} />}
              <span>Helpful</span>
              <span className="tabular-nums" aria-label={`${helpfulCount} people found this helpful`}>
                ({helpfulCount})
              </span>
            </button>
            {ownActions}
          </div>
          {!isOwn && (
            <button
              type="button"
              onClick={() => {
                if (ensureSignedIn('report')) onReport(review.id);
              }}
              className="inline-flex items-center gap-1.5 min-h-11 px-3 rounded-xl text-[11px] font-sans font-semibold text-allura-muted hover:text-rose-700 transition-colors"
            >
              <Flag size={12} />
              <span>Report</span>
            </button>
          )}
        </footer>
      </article>
    );
  }
);
ReviewCard.displayName = 'ReviewCard';
