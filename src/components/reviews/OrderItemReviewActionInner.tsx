import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PenLine, Star } from 'lucide-react';
import { MY_REVIEWS_PATH } from '../../config/reviews';
import { useMyReviews } from '../../hooks/useMyReviews';
import { LazyReviewFormModal } from './LazyReviewFormModal';
import type { ReviewFormTarget } from './ReviewFormModal';
import type { Order, OrderItem } from '../../types';

interface OrderItemReviewActionInnerProps {
  order: Order;
  item: OrderItem;
}

export const OrderItemReviewActionPlaceholder: React.FC = () => (
  <div className="h-11 w-36 mt-2 rounded-xl bg-stone-200 animate-pulse" aria-hidden="true" />
);

/** Loaded lazily by OrderItemReviewAction (default export for React.lazy). */
const OrderItemReviewActionInner: React.FC<OrderItemReviewActionInnerProps> = ({ order, item }) => {
  const my = useMyReviews();
  const [target, setTarget] = useState<ReviewFormTarget | null>(null);
  const productId = item.product.id;
  // When the list items carry no productId (backend gap), this stays undefined and the
  // customer sees "Write a Review"; the backend's 409 then points them to My Reviews.
  const existing = my.byProduct.get(productId);
  const productInfo = { name: item.product.name, image: item.product.images?.primary };

  if (!my.isSettled) return <OrderItemReviewActionPlaceholder />;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {existing ? (
        <>
          <button
            type="button"
            onClick={() => setTarget({ mode: 'edit', review: existing, product: productInfo })}
            className="inline-flex items-center gap-1.5 min-h-11 px-4 border border-allura-border rounded-xl text-xs font-sans font-bold text-allura-darkBrown hover:bg-allura-bgSecondary transition-colors"
          >
            <PenLine size={14} />
            <span>Edit Review</span>
          </button>
          <Link to={MY_REVIEWS_PATH} className="text-[11px] font-sans font-bold text-allura-goldDark hover:underline min-h-11 inline-flex items-center">
            View
          </Link>
        </>
      ) : (
        <button
          type="button"
          onClick={() =>
            setTarget({ mode: 'create', productId, orderId: order.id, variantId: item.variantId, product: productInfo })
          }
          className="inline-flex items-center gap-1.5 min-h-11 px-4 bg-allura-gold/15 text-allura-goldDark border border-allura-gold/30 rounded-xl text-xs font-sans font-bold hover:bg-allura-gold/25 transition-colors"
        >
          <Star size={14} />
          <span>Add Review</span>
        </button>
      )}

      <LazyReviewFormModal target={target} onClose={() => setTarget(null)} />
    </div>
  );
};

export default OrderItemReviewActionInner;
