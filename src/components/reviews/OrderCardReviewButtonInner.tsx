import React, { useState } from 'react';
import { PenLine, Star } from 'lucide-react';
import { useMyReviews } from '../../hooks/useMyReviews';
import { LazyReviewFormModal } from './LazyReviewFormModal';
import type { ReviewFormTarget } from './ReviewFormModal';
import type { Order } from '../../types';

interface OrderCardReviewButtonInnerProps {
  order: Order;
  /** The Track button's own classes, so the review button matches its style and position */
  className: string;
  iconSize: number;
}

/**
 * Loaded lazily by OrderCardReviewSwap (default export for React.lazy).
 * Uses the shared useMyReviews cache: one /customer/reviews request for the whole
 * page, however many cards render this.
 *
 * Several items, one button: opens Add Review for the first item not yet reviewed;
 * when every item is reviewed, Edit Review for the first item.
 */
const OrderCardReviewButtonInner: React.FC<OrderCardReviewButtonInnerProps> = ({ order, className: trackClassName, iconSize }) => {
  const my = useMyReviews();
  // Some Track links have no flex classes; keep the icon aligned with the label
  const className = `inline-flex items-center gap-1.5 ${trackClassName}`;
  const [target, setTarget] = useState<ReviewFormTarget | null>(null);
  const items = order.items.filter(item => !!item.product?.id);

  if (!my.isSettled || items.length === 0) {
    // Same footprint as the button while the shared cache loads
    return (
      <span className={`${className} opacity-60 pointer-events-none`} aria-hidden="true">
        <Star size={iconSize} />
        <span>Review</span>
      </span>
    );
  }

  // If productId can't be read from the customer's reviews (backend gap), every item
  // looks unreviewed: Add Review is shown and the backend's 409 points to My Reviews.
  const firstUnreviewed = items.find(item => !my.byProduct.get(item.product.id));
  const productInfo = (item: (typeof items)[number]) => ({ name: item.product.name, image: item.product.images?.primary });

  let label: string;
  let icon: React.ReactNode;
  let onClick: () => void;
  if (firstUnreviewed) {
    label = 'Add Review';
    icon = <Star size={iconSize} />;
    onClick = () =>
      setTarget({
        mode: 'create',
        productId: firstUnreviewed.product.id,
        orderId: order.id,
        variantId: firstUnreviewed.variantId,
        product: productInfo(firstUnreviewed),
      });
  } else {
    const first = items[0];
    const existing = my.byProduct.get(first.product.id)!;
    label = 'Edit Review';
    icon = <PenLine size={iconSize} />;
    onClick = () => setTarget({ mode: 'edit', review: existing, product: productInfo(first) });
  }

  return (
    <>
      <button type="button" onClick={onClick} className={className}>
        {icon}
        <span>{label}</span>
      </button>
      {/* After save the form invalidates the shared cache, so the label updates without a reload */}
      <LazyReviewFormModal target={target} onClose={() => setTarget(null)} />
    </>
  );
};

export default OrderCardReviewButtonInner;
