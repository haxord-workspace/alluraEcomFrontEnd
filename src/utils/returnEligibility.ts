import type { Order } from '../types';

/** Store promise: "Easy 7-day exchange", counted from the moment the order was delivered. */
export const RETURN_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const toDate = (value?: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** When the order was delivered: `deliveredAt`, else the latest DELIVERED entry in its status history. */
export const getDeliveredAt = (order: Order): Date | null => {
  const direct = toDate(order.deliveredAt);
  if (direct) return direct;

  const delivered = (order.history || [])
    .filter(h => String(h?.status || h?.to || '').trim().toUpperCase() === 'DELIVERED')
    .map(h => toDate(h?.changedAt || h?.createdAt || h?.timestamp))
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime());
  return delivered[0] || null;
};

// Each variant lists the other's fields as optional `never`, so `.reason` / `.deadline` can be
// read on either shape (some editor TS setups don't narrow on the boolean `eligible` flag).
export type ReturnEligibility =
  | { eligible: true; deliveredAt: Date; deadline: Date; reason?: never; deliveryDateUnknown?: never }
  | { eligible: false; reason: string; deliveryDateUnknown?: boolean; deliveredAt?: never; deadline?: never };

export const getReturnEligibility = (order: Order, now: number = Date.now()): ReturnEligibility => {
  if (order.orderStatus !== 'Delivered') {
    return { eligible: false, reason: 'Returns and exchanges are available only after your order is delivered.' };
  }

  const deliveredAt = getDeliveredAt(order);
  if (!deliveredAt) {
    return {
      eligible: false,
      deliveryDateUnknown: true,
      reason: "We couldn't confirm the delivery date for this order. Please contact us on WhatsApp for help.",
    };
  }

  const deadline = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * DAY_MS);
  if (now > deadline.getTime()) {
    return {
      eligible: false,
      reason: `The ${RETURN_WINDOW_DAYS}-day return / exchange window for this order closed on ${deadline.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })}.`,
    };
  }

  return { eligible: true, deliveredAt, deadline };
};
