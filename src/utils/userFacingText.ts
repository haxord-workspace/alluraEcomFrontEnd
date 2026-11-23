/**
 * Utility for formatting customer-facing text across the user side.
 * Ensures raw backend codes, uppercase enums, internal cancel reasons,
 * and admin notes are never exposed to customers.
 */

// Cancellation reason mapping for customer displays (e.g. Order Details page only; never in notifications)
export const USER_FACING_CANCEL_REASONS: Record<string, string | null> = {
  OUT_OF_STOCK: 'This product is out of stock',
  CUSTOMER_REQUESTED: 'Cancelled as per your request',
  PAYMENT_FAILED: 'Payment could not be completed',
  FRAUD_DETECTED: 'We were unable to process this order', // neutral wording on purpose
  OTHER: null, // show no reason line at all
};

// Known status and code mappings to friendly readable text
export const USER_FACING_CODES: Record<string, string> = {
  // Order Statuses
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DISPATCHED: 'Dispatched',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  CANCELED: 'Cancelled',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',

  // Payment Statuses
  PAID: 'Paid',
  CAPTURED: 'Paid',
  AUTHORIZED: 'Authorized',
  FAILED: 'Payment failed',
  PAYMENT_FAILED: 'Payment failed',
  REFUND_INITIATED: 'Refund initiated',
  PARTIALLY_REFUNDED: 'Partially refunded',

  // Refund Statuses
  INITIATED: 'Refund initiated',
  PROCESSED: 'Refund processed',
  COMPLETED: 'Refund completed',

  // Shipment / Tracking Milestones
  ORDER_PLACED: 'Order placed',
  IN_TRANSIT: 'In transit',
  FAILED_DELIVERY: 'Delivery attempt failed',

  // Return Statuses
  REQUESTED: 'Return requested',
  APPROVED: 'Return approved',
  REJECTED: 'Return rejected',
  PICKED_UP: 'Item picked up',
  RECEIVED: 'Item received',

  // Notification / Business Event Codes
  ORDER_CREATED: 'Order Placed',
  ORDER_STATUS_UPDATED: 'Order Update',
  ORDER_CANCELLED: 'Order Cancelled',
  PAYMENT_RECEIVED: 'Payment Confirmed',
  PAYMENT_REMINDER: 'Payment Reminder',
  ABANDONED_CART_REMINDER: 'Cart Reminder',
  WELCOME_CUSTOMER: 'Welcome',
  MARKETING_BROADCAST: 'Special Offer',
  DIRECT_MESSAGE: 'Message',
  NEW_ORDER_RECEIVED: 'Order Received',
  LOW_STOCK_ALERT: 'Stock Update',
};

/**
 * Converts any enum-like uppercase or underscore string to sentence/readable text.
 * Never crashes on null or undefined.
 */
export function toReadableText(value?: string | null): string {
  if (value == null) return '';
  const str = String(value).trim();
  if (!str) return '';

  const upper = str.toUpperCase();
  if (upper in USER_FACING_CODES) {
    return USER_FACING_CODES[upper];
  }

  // If already mixed case and has no underscores, preserve it
  if (/[a-z]/.test(str) && !str.includes('_')) {
    return str;
  }

  // Convert SCREAMING_SNAKE_CASE to Sentence case
  const withSpaces = str.replace(/[_-]+/g, ' ').trim();
  if (!withSpaces) return '';
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1).toLowerCase();
}

/**
 * Returns customer-friendly cancellation reason text, or null if no reason line should be shown.
 */
export function getUserFacingCancelReason(reason?: string | null): string | null {
  if (reason == null) return null;
  const trimmed = String(reason).trim();
  if (!trimmed) return null;

  const upper = trimmed.toUpperCase();
  if (upper in USER_FACING_CANCEL_REASONS) {
    return USER_FACING_CANCEL_REASONS[upper];
  }

  // If customer or backend provided 'Other' (case-insensitive), show no reason line
  if (upper === 'OTHER' || trimmed.toLowerCase() === 'other') {
    return null;
  }

  // If it's a known friendly string (e.g. from customer cancel dialog), keep it
  if (/[a-z]/.test(trimmed) && !trimmed.includes('_')) {
    return trimmed;
  }

  // Fallback for unknown codes: convert underscores to spaces in sentence case
  return toReadableText(trimmed);
}

/**
 * Helper for order status badge / label formatting on the user side.
 */
export function formatUserFacingStatus(status?: string | null): string {
  if (!status) return 'Pending';
  return toReadableText(status);
}

/**
 * Helper for payment status formatting on the user side.
 */
export function formatUserFacingPaymentStatus(status?: string | null): string {
  if (!status) return 'Pending';
  return toReadableText(status);
}

/**
 * Sanitizes any raw enum or uppercase codes embedded inside notification messages or titles.
 * Replaces uppercase underscore codes with friendly readable text.
 */
export function sanitizeNotificationText(text?: string | null): string {
  if (!text) return '';
  return String(text).replace(/\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/g, match => {
    return USER_FACING_CODES[match] || toReadableText(match);
  });
}

/**
 * Checks whether a raw notification represents an order cancellation.
 */
export function isOrderCancellationNotification(raw: any): boolean {
  if (!raw) return false;
  const event = String(raw.businessEvent || raw.type || '').toUpperCase();
  if (event === 'ORDER_CANCELLED') return true;

  const template = String(raw.templateCode || '').toUpperCase();
  if (template.includes('CANCEL')) return true;

  const payloadStatus = String(raw.payload?.status || '').toUpperCase();
  if (payloadStatus === 'CANCELLED' || payloadStatus === 'CANCELED') return true;

  const title = String(raw.title || raw.displayTitle || '').toLowerCase();
  const message = String(raw.message || raw.displayMessage || '').toLowerCase();

  if (title.includes('order') && (title.includes('cancell') || title.includes('cancel'))) return true;
  if (message.includes('order') && (message.includes('cancell') || message.includes('cancel'))) return true;

  return false;
}

/**
 * Safely extracts the order number and/or order id from notification payload/properties.
 * Never returns 'undefined' or 'null'.
 */
export function extractNotificationOrderRef(raw: any): { orderNumber?: string; orderId?: string } {
  if (!raw) return {};

  const clean = (val: any): string | undefined => {
    if (val == null) return undefined;
    const str = String(val).trim();
    if (!str || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') return undefined;
    return str;
  };

  const payload = raw.payload || {};
  let orderNumber = clean(payload.orderNumber || raw.orderNumber || payload.orderNo || raw.orderNo);
  const orderId = clean(payload.orderId || raw.orderId || raw.relatedEntityId || payload.id || raw.id);

  // If orderNumber is not found, attempt extraction from actionUrl: /account/orders/:id
  if (!orderNumber && raw.actionUrl) {
    const match = String(raw.actionUrl).match(/\/account\/orders\/([^/?#]+)/);
    if (match && clean(match[1])) {
      orderNumber = clean(match[1]);
    }
  }

  // If still not found, check title/message for a hash pattern like #ORD-12345
  if (!orderNumber) {
    const combined = `${raw.title || ''} ${raw.message || ''}`;
    const hashMatch = combined.match(/#([A-Za-z0-9_-]+)/);
    if (hashMatch && clean(hashMatch[1])) {
      orderNumber = clean(hashMatch[1]);
    }
  }

  return { orderNumber, orderId };
}

/**
 * Resolves safe, customer-friendly title, message, and actionUrl for any customer notification.
 */
export function formatCustomerNotificationView(notif: any): {
  title: string;
  message: string;
  actionUrl?: string;
} {
  const isCancelled = isOrderCancellationNotification(notif);
  if (isCancelled) {
    const { orderNumber, orderId } = extractNotificationOrderRef(notif);
    const ref = orderNumber || orderId;
    const actionUrl = notif.actionUrl || (orderId || orderNumber ? `/account/orders/${orderId || orderNumber}` : undefined);
    return {
      title: 'Order cancelled',
      message: ref
        ? `Your order #${ref.replace(/^#/, '')} has been cancelled.`
        : 'Your order has been cancelled.',
      actionUrl,
    };
  }

  return {
    title: sanitizeNotificationText(notif.title || ''),
    message: sanitizeNotificationText(notif.message || ''),
    actionUrl: notif.actionUrl,
  };
}

