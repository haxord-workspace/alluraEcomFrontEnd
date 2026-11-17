import { REVIEWS_ENABLED } from '../config/reviews';
import type { Order, OrderItem, PaymentStatus } from '../types';

/**
 * Mirrors the backend rule for POST /products/{productId}/reviews:
 * a delivered AND paid order containing the product. Uses the mapped UI values
 * from service/orders.ts (DELIVERED → 'Delivered', PAID/CAPTURED → 'Paid'/'Captured').
 * The backend stays the authority; a 403 is still handled.
 */
const REVIEWABLE_PAYMENT_STATUSES: readonly PaymentStatus[] = ['Paid', 'Captured'];

export const isOrderReviewable = (order: Pick<Order, 'orderStatus' | 'paymentStatus'>): boolean =>
  order.orderStatus === 'Delivered' && REVIEWABLE_PAYMENT_STATUSES.includes(order.paymentStatus);

/**
 * Order Details "Track" button: replaced by the per-item review action only when that
 * action will actually render (module on, Delivered + Paid/Captured, an item with a
 * product id). Delivered but unpaid (e.g. COD pending) keeps Track, so the customer is
 * never left with no action. REVIEWS_ENABLED=false → always true (original behaviour).
 */
export const shouldShowOrderTracking = (order: Pick<Order, 'orderStatus' | 'paymentStatus' | 'items'>): boolean =>
  !(REVIEWS_ENABLED && isOrderReviewable(order) && order.items.some(item => !!item.product?.id));

/** First reviewable order (list order, newest first from the API) containing the product. */
export const findReviewableOrderItem = (
  orders: readonly Order[],
  productId: string
): { order: Order; item: OrderItem } | null => {
  if (!productId) return null;
  for (const order of orders) {
    if (!isOrderReviewable(order)) continue;
    const item = order.items.find(i => i.product.id === productId);
    if (item) return { order, item };
  }
  return null;
};
