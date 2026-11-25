import type { Order } from '../types';

// Pure eligibility rules for the customer-facing invoice and address-slip download
// buttons, so neither is ever shown when the matching endpoint would 403/409.
// Mirrors `exchangeEligibility.ts`'s pattern: no side effects, no React.

/** Order statuses where the order is still active (not cancelled/returned/refunded) */
const ACTIVE_STATUSES: Order['orderStatus'][] = [
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

/** Payment statuses that count as "paid" (captured funds the shop has received) */
const PAID_STATUSES: Order['paymentStatus'][] = ['Paid'];

export const isCodConfirmed = (order: Order): boolean =>
  order.paymentMethod === 'COD' && ACTIVE_STATUSES.includes(order.orderStatus);

/** Invoice: paid (including after a refund), or a confirmed/active COD order */
export const canDownloadInvoice = (order: Order): boolean =>
  PAID_STATUSES.includes(order.paymentStatus) || order.paymentStatus === 'Refunded' || isCodConfirmed(order);

/** Address slip: paid or confirmed COD, and the order hasn't been cancelled/returned */
export const canDownloadSlip = (order: Order): boolean =>
  (PAID_STATUSES.includes(order.paymentStatus) || isCodConfirmed(order)) && ACTIVE_STATUSES.includes(order.orderStatus);
