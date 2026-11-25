import type { Order } from '../types';

/**
 * Store policy: exchange only (no returns), within 7 days of the actual delivery time.
 * exchangeExpiryAt = deliveredAt + 7 days; eligible while now < exchangeExpiryAt.
 */
export const EXCHANGE_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export const EXCHANGE_EXPIRED_MESSAGE = `Exchange period has expired. Exchanges are available only within ${EXCHANGE_WINDOW_DAYS} days of delivery.`;

const toDate = (value?: string): Date | null => {
  if (!value) return null;
  // ISO strings from the API carry their zone ("Z" / offset), so this is an absolute instant
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * When the order was delivered: the backend's `deliveredAt`, else the latest DELIVERED entry in
 * its status history. Never the order/payment date.
 */
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
export type ExchangeEligibility =
  | { eligible: true; deliveredAt: Date; deadline: Date; reason?: never; expired?: never; deliveryDateUnknown?: never }
  | {
      eligible: false;
      reason: string;
      /** Delivered, but the 7-day window has closed */
      expired?: boolean;
      /** Delivered, but no valid delivery timestamp is known */
      deliveryDateUnknown?: boolean;
      /** Set when expired */
      deadline?: Date;
      deliveredAt?: never;
    };

export const getExchangeEligibility = (order: Order, now: number = Date.now()): ExchangeEligibility => {
  if (order.orderStatus !== 'Delivered') {
    return { eligible: false, reason: 'Exchanges are available only after your order is delivered.' };
  }

  const deliveredAt = getDeliveredAt(order);
  if (!deliveredAt) {
    return {
      eligible: false,
      deliveryDateUnknown: true,
      reason: "We couldn't confirm the delivery date for this order. Please contact us on WhatsApp for help.",
    };
  }

  const deadline = new Date(deliveredAt.getTime() + EXCHANGE_WINDOW_DAYS * DAY_MS);
  if (now >= deadline.getTime()) {
    return { eligible: false, expired: true, deadline, reason: EXCHANGE_EXPIRED_MESSAGE };
  }

  return { eligible: true, deliveredAt, deadline };
};

/** "27 Nov 2026, 3:30 pm" in the viewer's local time zone */
export const formatExchangeDeadline = (deadline: Date): string =>
  deadline.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
