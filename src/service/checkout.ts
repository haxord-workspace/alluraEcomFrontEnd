import api from './api';
import { firstNumber } from '../utils/number';

// -----------------------------------------------------------------------------
// Checkout endpoints (customer, authenticated)
// POST /checkout/preview — totals with discounts, coupon, shipping & tax (no side effects)
// POST /checkout/create  — locks inventory and creates a checkout snapshot for payment
//                          (requires an Idempotency-Key header)
// -----------------------------------------------------------------------------

export interface CheckoutRequest {
  cartId: string;
  addressId: string;
  couponCode?: string;
  shippingMethod?: string;
}

export interface CheckoutLine {
  cartItemId?: string;
  productId?: string;
  variantId?: string | null;
  sku?: string;
  quantity: number;
  unitPrice: number;
  lineSubtotal: number;
  productDiscount: number;
  finalLineTotal: number;
}

export interface CheckoutSummary {
  items: CheckoutLine[];
  subtotal: number;
  productDiscount: number;
  promotionDiscount: number;
  couponDiscount: number;
  shippingAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  couponCode?: string;
  shippingMethod?: string;
}

export interface CheckoutSession {
  checkoutId: string;
  /** The order created for this checkout (used by POST /payments/create) */
  orderId: string;
  orderNumber?: string;
  customerId?: string;
  summary: CheckoutSummary;
  reservationIds: string[];
  status: string;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const idOf = (v: any) => (v && typeof v === 'object' ? v._id || v.id : v);

const mapLine = (i: any): CheckoutLine => {
  const quantity = firstNumber(i.quantity, i.qty) ?? 1;
  const lineSubtotalRaw = firstNumber(i.lineSubtotal, i.subtotal, i.lineTotal, i.amount);
  const unitPrice =
    firstNumber(i.unitPrice, i.price, i.sellingPrice, i.pricing?.sellingPrice, i.variant?.pricing?.sellingPrice) ??
    (lineSubtotalRaw !== undefined && quantity ? lineSubtotalRaw / quantity : 0);
  const lineSubtotal = lineSubtotalRaw ?? unitPrice * quantity;
  const productDiscount = firstNumber(i.productDiscount, i.discount, i.discountAmount) ?? 0;
  return {
    cartItemId: idOf(i.cartItemId) ?? idOf(i.itemId) ?? idOf(i._id),
    productId: idOf(i.productId),
    variantId: idOf(i.variantId) ?? null,
    sku: i.sku || i.variant?.sku,
    quantity,
    unitPrice,
    lineSubtotal,
    productDiscount,
    finalLineTotal: firstNumber(i.finalLineTotal, i.lineTotal, i.total, i.finalAmount) ?? lineSubtotal - productDiscount,
  };
};

// Reads the documented CheckoutSummary shape, plus common alternatives (nested totals,
// different field names, Decimal128 / string amounts)
const mapSummary = (raw: any): CheckoutSummary => {
  const t = { ...(raw?.totals || {}), ...(raw?.pricing || {}), ...(raw || {}) };
  const items: CheckoutLine[] = Array.isArray(raw?.items) ? raw.items.map(mapLine) : [];

  const itemsTotal = items.reduce((sum, l) => sum + l.lineSubtotal, 0);
  const subtotal = firstNumber(t.subtotal, t.subTotal, t.itemsSubtotal, t.itemsTotal, t.merchandiseTotal) ?? itemsTotal;
  const productDiscount = firstNumber(t.productDiscount, t.productDiscountTotal) ?? 0;
  const promotionDiscount = firstNumber(t.promotionDiscount, t.promotionDiscountTotal) ?? 0;
  const couponDiscount = firstNumber(t.couponDiscount, t.couponDiscountAmount) ?? 0;
  const shippingAmount = firstNumber(t.shippingAmount, t.shipping, t.shippingFee, t.shippingCost) ?? 0;
  const taxAmount = firstNumber(t.taxAmount, t.tax, t.taxTotal, t.gst) ?? 0;
  const total =
    firstNumber(t.total, t.grandTotal, t.totalAmount, t.payable, t.amountPayable) ??
    Math.max(0, subtotal - productDiscount - promotionDiscount - couponDiscount) + shippingAmount + taxAmount;

  return {
    items,
    subtotal,
    productDiscount,
    promotionDiscount,
    couponDiscount,
    shippingAmount,
    taxAmount,
    total,
    currency: t.currency || 'INR',
    couponCode: t.couponCode,
    shippingMethod: t.shippingMethod,
  };
};

// Only send optional fields when set (an empty string could fail validation)
const toBody = (req: CheckoutRequest): CheckoutRequest => ({
  cartId: req.cartId,
  addressId: req.addressId,
  ...(req.couponCode ? { couponCode: req.couponCode } : {}),
  ...(req.shippingMethod ? { shippingMethod: req.shippingMethod } : {}),
});

export const checkoutErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error?.details?.[0]?.message || error?.response?.data?.message || fallback;

/** POST /checkout/preview */
export const previewCheckout = async (req: CheckoutRequest): Promise<CheckoutSummary> => {
  const response = await api.post('/checkout/preview', toBody(req));
  const data = unwrap(response);
  if (import.meta.env.DEV) console.debug('[checkout] preview response', data);
  return mapSummary(data?.summary || data);
};

/** A unique key per checkout attempt; reuse it when retrying the same attempt */
export const newIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `chk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** POST /checkout/create */
export const createCheckout = async (req: CheckoutRequest, idempotencyKey: string): Promise<CheckoutSession> => {
  const response = await api.post('/checkout/create', toBody(req), {
    headers: { 'Idempotency-Key': idempotencyKey },
  });
  const data = unwrap(response) || {};
  if (import.meta.env.DEV) console.debug('[checkout] create response', data);
  const order = data.order && typeof data.order === 'object' ? data.order : null;
  const checkoutId = data.checkoutId || data._id || data.id || '';
  return {
    checkoutId,
    orderId: data.orderId || order?._id || order?.id || checkoutId,
    orderNumber: data.orderNumber || order?.orderNumber,
    customerId: data.customerId,
    summary: mapSummary(data.summary || data),
    reservationIds: Array.isArray(data.reservationIds) ? data.reservationIds : [],
    status: data.status || 'CREATED',
  };
};
