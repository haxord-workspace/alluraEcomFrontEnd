import React, { Suspense, lazy } from 'react';
import { REVIEWS_ENABLED } from '../../config/reviews';
import { isOrderReviewable } from '../../utils/reviewEligibility';
import { ReviewsErrorBoundary } from './ReviewsErrorBoundary';
import type { Order, OrderItem } from '../../types';

// The button logic, the customer-reviews cache and the review service load in a
// separate chunk, and only for orders that can actually be reviewed.
const OrderItemReviewActionInner = lazy(() => import('./OrderItemReviewActionInner'));

interface OrderItemReviewActionProps {
  order: Order;
  item: OrderItem;
}

/**
 * One-line mount for Order Details: "Write a Review" / "Edit Review" for one order line.
 * Renders nothing unless the module is on and the order is Delivered + Paid/Captured.
 * Isolated by an error boundary so it can never break the order page.
 */
export const OrderItemReviewAction: React.FC<OrderItemReviewActionProps> = ({ order, item }) => {
  if (!REVIEWS_ENABLED || !item.product?.id || !isOrderReviewable(order)) return null;
  return (
    <ReviewsErrorBoundary silent>
      <Suspense fallback={<div className="h-11 w-36 mt-2 rounded-xl bg-stone-200 animate-pulse" aria-hidden="true" />}>
        <OrderItemReviewActionInner order={order} item={item} />
      </Suspense>
    </ReviewsErrorBoundary>
  );
};
