import React, { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ImageOff, MessageSquareReply } from 'lucide-react';
import { StarRatingDisplay } from './StarRating';
import { OwnReviewButtons } from './MyReviewPanel';
import { formatReviewDate } from '../../utils/reviewFormat';
import type { CustomerReview, ReviewImage } from '../../types/reviews';

interface MyReviewCardProps {
  review: CustomerReview;
  isDeleting: boolean;
  onEdit: (review: CustomerReview) => void;
  onDelete: (review: CustomerReview) => void;
  onOpenImage: (images: ReviewImage[], index: number) => void;
}

/** Comments longer than this start collapsed with a "Read more" toggle */
const LONG_COMMENT = 280;

/**
 * One of the customer's own reviews on My Reviews. Plain-text rendering only.
 * Review status / rejection reason are intentionally not shown to customers.
 */
export const MyReviewCard: React.FC<MyReviewCardProps> = memo(({ review, isDeleting, onEdit, onDelete, onOpenImage }) => {
  const [expanded, setExpanded] = useState(false);
  const productName = review.productName || 'Unknown product';
  // The storefront product route is /product/:slug, so a link needs the slug (an id alone can't link)
  const productHref = review.productSlug ? `/product/${review.productSlug}` : null;
  const date = formatReviewDate(review.updatedAt || review.createdAt);
  const isLong = review.comment.length > LONG_COMMENT;

  const thumb = (
    <span className="block w-20 h-24 sm:w-24 sm:h-28 rounded-xl overflow-hidden bg-allura-bg border border-allura-border flex-shrink-0">
      {review.productImage ? (
        <img
          src={review.productImage}
          alt={productName}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <span className="w-full h-full flex items-center justify-center">
          <ImageOff size={20} className="text-allura-muted" aria-label="No product image" />
        </span>
      )}
    </span>
  );

  return (
    <article
      className={`bg-allura-card border border-allura-border rounded-2xl shadow-subtle overflow-hidden transition-shadow hover:shadow-md ${isDeleting ? 'opacity-60' : ''}`}
      aria-label={`Your review of ${productName}`}
    >
      {/* Product + rating */}
      <header className="flex items-start gap-3.5 sm:gap-5 p-4 sm:p-6">
        {productHref ? (
          <Link to={productHref} tabIndex={-1} aria-hidden="true" className="group">
            {thumb}
          </Link>
        ) : (
          thumb
        )}

        <div className="flex-1 min-w-0 space-y-2 pt-0.5">
          <p className="text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-allura-goldDark">Your review</p>
          {productHref ? (
            <Link
              to={productHref}
              className="block font-serif text-base sm:text-lg leading-snug text-allura-text hover:text-allura-goldDark hover:underline line-clamp-2 break-words"
            >
              {productName}
            </Link>
          ) : (
            <p className={`font-serif text-base sm:text-lg leading-snug line-clamp-2 break-words ${review.productName ? 'text-allura-text' : 'text-allura-muted italic'}`}>
              {productName}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-sans text-allura-muted">
            <StarRatingDisplay rating={review.rating} size={14} />
            {date && (
              <time dateTime={review.updatedAt || review.createdAt || undefined} className="whitespace-nowrap">
                {date}
              </time>
            )}
            {review.isVerifiedPurchase && (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold whitespace-nowrap">
                <BadgeCheck size={13} />
                Verified purchase
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Review content */}
      {(review.title || review.comment || review.images.length > 0 || review.adminResponse) && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4">
          {(review.title || review.comment) && (
            <div className="space-y-1.5 border-t border-allura-border/60 pt-4">
              {review.title && <h3 className="font-serif text-base sm:text-lg text-allura-text font-semibold break-words">{review.title}</h3>}
              {review.comment && (
                <>
                  <p
                    className={`text-sm font-sans text-allura-text/80 leading-relaxed whitespace-pre-line break-words ${isLong && !expanded ? 'line-clamp-4' : ''}`}
                  >
                    {review.comment}
                  </p>
                  {isLong && (
                    <button
                      type="button"
                      onClick={() => setExpanded(v => !v)}
                      className="min-h-9 text-xs font-sans font-bold text-allura-goldDark hover:underline"
                      aria-expanded={expanded}
                    >
                      {expanded ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {review.images.length > 0 && (
            // Swipeable row on mobile, wraps on larger screens
            <ul
              className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible"
              aria-label="Your review photos"
            >
              {review.images.map((img, idx) => (
                <li key={`${img.url}-${idx}`} className="snap-start flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenImage(review.images, idx)}
                    className="block w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-allura-border bg-allura-bg hover:border-allura-gold transition-colors focus:outline-none focus:ring-2 focus:ring-allura-gold"
                    aria-label={`Open photo ${idx + 1} of ${review.images.length}`}
                  >
                    <img src={img.thumbnailUrl} alt={img.alt || `Your review photo ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {review.adminResponse && (
            <div className="bg-allura-bg/60 border border-allura-border border-l-4 border-l-allura-gold rounded-xl p-3.5 sm:p-4 space-y-1.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-sans font-bold uppercase tracking-[0.2em] text-allura-goldDark">
                <MessageSquareReply size={13} className="flex-shrink-0" />
                <span>Response from Allura</span>
                {review.adminResponse.respondedAt && (
                  <span className="font-normal normal-case tracking-normal text-allura-muted">
                    {formatReviewDate(review.adminResponse.respondedAt)}
                  </span>
                )}
              </p>
              <p className="text-xs sm:text-sm font-sans text-allura-text/80 leading-relaxed whitespace-pre-line break-words">
                {review.adminResponse.message}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Actions: full-width buttons on mobile, right-aligned on larger screens */}
      <footer className="flex items-center justify-end px-4 sm:px-6 py-3 bg-allura-bg/40 border-t border-allura-border/60 [&>div]:w-full sm:[&>div]:w-auto [&_button]:flex-1 sm:[&_button]:flex-none [&_button]:justify-center">
        <OwnReviewButtons isDeleting={isDeleting} onEdit={() => onEdit(review)} onDelete={() => onDelete(review)} />
      </footer>
    </article>
  );
});
MyReviewCard.displayName = 'MyReviewCard';
