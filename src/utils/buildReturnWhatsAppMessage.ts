import type { Order, OrderItem } from '../types';
import { buildWhatsAppUrl } from './whatsapp';

export type ReturnRequestType = 'Return' | 'Exchange';

export interface ReturnRequestSelection {
  item: OrderItem;
  /** How many of this line the customer wants to return / exchange (1..item.quantity) */
  quantity: number;
}

export interface ReturnRequestDetails {
  type: ReturnRequestType;
  items: ReturnRequestSelection[];
  reason: string;
  comments?: string;
  /** Exchange only */
  preferredVariant?: string;
}

interface BuildOptions {
  includeCustomer?: boolean;
  /** Max characters of free text kept from comments / preferred size-colour */
  maxFreeText?: number;
}

/** WhatsApp links get unreliable past ~2000 characters on some devices/browsers */
export const MAX_WHATSAPP_URL_LENGTH = 2000;

const clean = (value: unknown): string => (value === undefined || value === null ? '' : String(value).trim());

const truncate = (text: string, max?: number): string => {
  if (max === undefined || text.length <= max) return text;
  return max <= 1 ? '' : `${text.slice(0, max - 1).trimEnd()}…`;
};

const formatRupees = (amount?: number): string =>
  typeof amount === 'number' && Number.isFinite(amount) && amount > 0
    ? `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : '';

const formatOrderDate = (order: Order): string => {
  const d = order.placedAt ? new Date(order.placedAt) : null;
  if (d && !Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return clean(order.date);
};

/** "Label: value", or nothing when the value is empty (never prints "Size: -" or blank labels) */
const line = (label: string, value: unknown, indent = ''): string[] => {
  const text = clean(value);
  return text ? [`${indent}${label}: ${text}`] : [];
};

/** Line price shown for an item: backend finalPrice when present, else the unit price */
export const getItemDisplayPrice = (item: OrderItem): number => item.finalPrice ?? item.unitPrice;

/** Builds the plain-text WhatsApp message for a return / exchange request. Pure. */
export const buildReturnWhatsAppMessage = (
  order: Order,
  request: ReturnRequestDetails,
  { includeCustomer = true, maxFreeText }: BuildOptions = {}
): string => {
  const lines: string[] = [];

  lines.push(`*${request.type} Request*`, '');

  lines.push(
    '*Order Details*',
    ...line('Order No', order.orderNumber),
    ...line('Order ID', order.id),
    ...line('Order Date', formatOrderDate(order)),
    ...line('Order Status', order.orderStatus),
    ...line('Order Total', formatRupees(order.total)),
    ''
  );

  const paymentLines = [
    ...line('Payment ID', order.paymentTransactionId || order.transactionId),
    ...line('Payment Method', order.paymentMethod),
    ...line('Payment Status', order.paymentStatus),
  ];
  if (paymentLines.length) lines.push('*Payment Details*', ...paymentLines, '');

  if (includeCustomer) {
    const customerLines = [...line('Name', order.customer?.name), ...line('Phone', order.customer?.phone)];
    if (customerLines.length) lines.push('*Customer*', ...customerLines, '');
  }

  lines.push('*Selected Products*');
  request.items.forEach(({ item, quantity }, idx) => {
    const pad = '   ';
    lines.push(
      `${idx + 1}. ${clean(item.product?.name) || 'Product'}`,
      `${pad}SKU: ${clean(item.sku) || 'N/A'}`,
      ...line('Size', item.selectedSize, pad),
      ...line('Color', item.selectedColor?.name, pad),
      `${pad}Qty: ${quantity} of ${item.quantity}`,
      ...line('Price', formatRupees(getItemDisplayPrice(item)), pad)
    );
  });
  lines.push('');

  lines.push('*Reason*', clean(request.reason));
  lines.push(...line('Comments', truncate(clean(request.comments), maxFreeText)));
  if (request.type === 'Exchange') {
    lines.push(...line('Preferred size/color', truncate(clean(request.preferredVariant), maxFreeText)));
  }
  lines.push('', 'Please help me with this request.');

  return lines.join('\n');
};

/**
 * Full wa.me URL, kept under MAX_WHATSAPP_URL_LENGTH: first drops the customer block, then
 * shortens the free-text comments. Order number, payment id, product names and reason are never dropped.
 */
export const buildReturnWhatsAppUrl = (number: string, order: Order, request: ReturnRequestDetails): string => {
  const attempts: BuildOptions[] = [
    { includeCustomer: true },
    { includeCustomer: false },
    { includeCustomer: false, maxFreeText: 300 },
    { includeCustomer: false, maxFreeText: 120 },
    { includeCustomer: false, maxFreeText: 40 },
    { includeCustomer: false, maxFreeText: 0 },
  ];
  let url = '';
  for (const opts of attempts) {
    url = buildWhatsAppUrl(number, buildReturnWhatsAppMessage(order, request, opts));
    if (url.length <= MAX_WHATSAPP_URL_LENGTH) return url;
  }
  // Still long (e.g. many items): send it anyway rather than drop required details
  return url;
};
