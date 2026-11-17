import React, { Suspense, lazy } from 'react';
import { shouldShowOrderTracking } from '../../utils/reviewEligibility';
import { ReviewsErrorBoundary } from './ReviewsErrorBoundary';
import type { Order } from '../../types';

// Review logic + the shared customer-reviews cache load in a separate chunk, and only
// for cards that actually swap (Delivered + paid), so list pages carry nothing extra.
const OrderCardReviewButtonInner = lazy(() => import('./OrderCardReviewButtonInner'));

interface OrderCardReviewSwapProps {
  order: Order;
  /** Classes of the wrapped Track button, reused so the review button matches it */
  buttonClassName: string;
  iconSize?: number;
  /** The card's existing Track button, rendered unchanged when Track should show */
  children: React.ReactNode;
}

/**
 * Wraps an order card's existing Track button. Renders it unchanged when
 * shouldShowOrderTracking(order) is true (every status except Delivered + paid, and
 * always when REVIEWS_ENABLED=false). Otherwise renders one Add Review / Edit Review
 * button in its place, never both. Any failure falls back to the original Track button.
 */
export const OrderCardReviewSwap: React.FC<OrderCardReviewSwapProps> = ({ order, buttonClassName, iconSize = 13, children }) => {
  if (shouldShowOrderTracking(order)) return <>{children}</>;
  return (
    <ReviewsErrorBoundary fallback={children}>
      <Suspense
        fallback={
          <span className={`inline-flex items-center gap-1.5 ${buttonClassName} opacity-60 pointer-events-none`} aria-hidden="true">
            Review
          </span>
        }
      >
        <OrderCardReviewButtonInner order={order} className={buttonClassName} iconSize={iconSize} />
      </Suspense>
    </ReviewsErrorBoundary>
  );
};
