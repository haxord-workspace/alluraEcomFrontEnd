import React from 'react';
import { REVIEWS_ENABLED } from '../../config/reviews';
import { useReviewSummary } from '../../hooks/useReviewSummaryStore';
import { ReviewsErrorBoundary } from './ReviewsErrorBoundary';
import { StarRatingDisplay } from './StarRating';
import { scrollToProductReviews } from './reviewsAnchor';
import { pluralizeReviews } from '../../utils/reviewFormat';

interface ProductRatingInlineProps {
  productId: string;
  /** product.averageRating from the product payload (used until the live summary loads) */
  rating: number;
  /** product.reviewCount from the product payload */
  reviewsCount: number;
  /** The page's original rating markup, rendered unchanged while REVIEWS_ENABLED is false */
  children?: React.ReactNode;
}

/**
 * Rating line beside the product title. Shows real (partial) stars and the count,
 * or "No reviews yet" when there are none (never "0.0"). Prefers the live summary
 * published by the reviews section; makes no request of its own.
 */
export const ProductRatingInline: React.FC<ProductRatingInlineProps> = ({ children, ...props }) => {
  if (!REVIEWS_ENABLED) return <>{children}</>;
  return (
    <ReviewsErrorBoundary silent>
      <ProductRatingInlineInner {...props} />
    </ReviewsErrorBoundary>
  );
};

const ProductRatingInlineInner: React.FC<Omit<ProductRatingInlineProps, 'children'>> = ({ productId, rating, reviewsCount }) => {
  const live = useReviewSummary(productId);
  const average = live ? live.averageRating : Number(rating) || 0;
  const count = live ? live.reviewCount : Number(reviewsCount) || 0;

  if (count <= 0 || average <= 0) {
    return <span className="text-xs font-sans text-allura-muted">No reviews yet</span>;
  }

  return (
    <button
      type="button"
      onClick={scrollToProductReviews}
      className="flex items-center gap-1.5 text-xs text-amber-700 font-sans hover:underline underline-offset-2"
      aria-label={`Rated ${average.toFixed(1)} out of 5 from ${pluralizeReviews(count)}. Go to reviews`}
    >
      <StarRatingDisplay rating={average} size={13} />
      <span className="font-semibold">{average.toFixed(1)}</span>
      <span className="text-allura-muted">({pluralizeReviews(count)})</span>
    </button>
  );
};
