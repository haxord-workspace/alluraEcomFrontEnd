import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { ImageOff } from 'lucide-react';
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

/**
 * One of the customer's own reviews on My Reviews. Plain-text rendering only.
 * Review status / rejection reason are intentionally not shown to customers.
 */
export const MyReviewCard: React.FC<MyReviewCardProps> = memo(({ review, isDeleting, onEdit, onDelete, onOpenImage }) => {
  const productName = review.productName || 'Unknown product';
  // The storefront product route is /product/:slug, so a link needs the slug (an id alone can't link)
  const productHref = review.productSlug ? `/product/${review.productSlug}` : null;
  const date = formatReviewDate(review.updatedAt || review.createdAt);

  const thumb = (
    <span className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden bg-allura-bg border border-allura-border flex items-center justify-center flex-shrink-0">
      {review.productImage ? (
        <img src={review.productImage} alt={productName} loading="lazy" decoding="async" className="w-full h-full object-cover" />
      ) : (
        <ImageOff size={18} className="text-allura-muted" aria-label="No product image" />
      )}
    </span>
  );

  return (
    <article className="bg-allura-card border border-allura-border rounded-2xl p-4 sm:p-6 shadow-subtle space-y-4" aria-label={`Your review of ${productName}`}>
      <header className="flex items-start gap-3 sm:gap-4">
        {productHref ? (
          <Link to={productHref} tabIndex={-1} aria-hidden="true">
            {thumb}
          </Link>
        ) : (
          thumb
        )}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            {productHref ? (
              <Link to={productHref} className="font-serif text-base text-allura-text hover:text-allura-goldDark hover:underline line-clamp-2 break-words">
                {productName}
              </Link>
            ) : (
              <p className={`font-serif text-base line-clamp-2 break-words ${review.productName ? 'text-allura-text' : 'text-allura-muted italic'}`}>
                {productName}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-sans text-allura-muted">
            <StarRatingDisplay rating={review.rating} size={13} />
            {date && <time dateTime={review.updatedAt || review.createdAt || undefined}>{date}</time>}
          </div>
        </div>
      </header>

      {review.title && <h3 className="font-serif text-base text-allura-text font-semibold break-words">{review.title}</h3>}
      {review.comment && (
        <p className="text-xs sm:text-sm font-sans text-allura-text/80 leading-relaxed whitespace-pre-line break-words">{review.comment}</p>
      )}

      {review.images.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Your review photos">
          {review.images.map((img, idx) => (
            <li key={`${img.url}-${idx}`}>
              <button
                type="button"
                onClick={() => onOpenImage(review.images, idx)}
                className="block w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-allura-border bg-allura-bg focus:outline-none focus:ring-2 focus:ring-allura-gold"
                aria-label={`Open photo ${idx + 1} of ${review.images.length}`}
              >
                <img src={img.thumbnailUrl} alt={img.alt || `Your review photo ${idx + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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

      <footer className="pt-1 border-t border-allura-border/60">
        <div className="pt-3">
          <OwnReviewButtons isDeleting={isDeleting} onEdit={() => onEdit(review)} onDelete={() => onDelete(review)} />
        </div>
      </footer>
    </article>
  );
});
MyReviewCard.displayName = 'MyReviewCard';
