import api from './api';
import adminApi from './adminApi';
import { mapStoreProduct, NO_COLOR } from './store';
import { colorHex } from '../data/colorPalette';
import { firstNumber } from '../utils/number';
import type { Order, OrderItem, OrderStatus, PaymentStatus, SavedAddress, TrackingMilestone } from '../types';

// -----------------------------------------------------------------------------
// Order endpoints
// Customer: GET /orders, GET /orders/{orderId}, POST /orders/{orderId}/cancel
// Admin:    GET /admin/orders, GET /admin/orders/{orderId},
//           PATCH /admin/orders/{orderId}/status, POST /admin/orders/{orderId}/cancel
// -----------------------------------------------------------------------------

export interface OrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string; // admin only
}

export interface OrderList {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface StatusUpdatePayload {
  status: string;
  note?: string;
  trackingNumber?: string;
  shippingCarrier?: string;
}

// ── Status mapping (backend UPPER_SNAKE <-> UI labels) ─────────────────────────

const STATUS_TO_UI: Record<string, OrderStatus> = {
  PENDING: 'Pending',
  PENDING_PAYMENT: 'Pending',
  PLACED: 'Pending',
  CREATED: 'Pending',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Processing',
  PACKED: 'Packed',
  READY_TO_SHIP: 'Packed',
  SHIPPED: 'Shipped',
  IN_TRANSIT: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
  CANCELED: 'Cancelled',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};

/** UI label -> backend value, e.g. "Out for Delivery" -> "OUT_FOR_DELIVERY" */
export const toBackendStatus = (status: OrderStatus | string) =>
  String(status).trim().toUpperCase().replace(/[\s-]+/g, '_');

const toUiStatus = (raw?: string): OrderStatus => {
  const key = toBackendStatus(raw || 'PENDING');
  return STATUS_TO_UI[key] || 'Pending';
};

/** "OUT_FOR_DELIVERY" -> "Out For Delivery" */
export const prettyStatus = (raw?: string) =>
  String(raw || '')
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(w => w[0].toUpperCase() + w.slice(1))
    .join(' ');

const PAYMENT_STATUS: Record<string, PaymentStatus> = {
  PENDING: 'Pending',
  AUTHORIZED: 'Authorized',
  CAPTURED: 'Captured',
  PAID: 'Paid',
  SUCCESS: 'Paid',
  COMPLETED: 'Paid',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

const toPaymentMethod = (raw?: string): Order['paymentMethod'] => {
  const v = String(raw || '').toUpperCase();
  if (v.includes('COD') || v.includes('CASH')) return 'COD';
  if (v.includes('CARD')) return 'Card';
  if (v.includes('NET')) return 'NetBanking';
  return 'UPI';
};

// ── Mapping helpers ───────────────────────────────────────────────────────────

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const num = (...values: any[]): number => firstNumber(...values) ?? 0;

const formatDate = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateTime = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const splitPhone = (value: string) => {
  const v = value.replace(/\s+/g, '');
  const m = v.match(/^(\+\d{1,3})(\d{6,})$/);
  // "+914433221122" -> { +91, 4433221122 } (assumes a 10-digit local number)
  if (m && v.length > 11) return { countryCode: v.slice(0, v.length - 10), number: v.slice(-10) };
  return m ? { countryCode: m[1], number: m[2] } : { countryCode: '+91', number: v };
};

const mapAddress = (raw: any): SavedAddress => {
  const phone = raw?.phone ?? raw?.phoneNumber ?? raw?.mobile;
  const nameFromParts = [raw?.firstName, raw?.lastName]
    .map((v: any) => (typeof v === 'string' ? v.trim() : ''))
    .filter(v => v && v !== '.')
    .join(' ');
  return {
    id: raw?._id || raw?.id || '',
    label: raw?.label || 'Delivery',
    fullName: raw?.fullName || raw?.name || nameFromParts,
    phone:
      typeof phone === 'object' && phone
        ? { countryCode: phone.countryCode || '+91', number: phone.number || '' }
        : phone
        ? splitPhone(String(phone))
        : { countryCode: '+91', number: '' },
    addressLine1: raw?.addressLine1 || raw?.line1 || '',
    addressLine2: raw?.addressLine2 || raw?.line2,
    landmark: raw?.landmark,
    city: raw?.city || '',
    state: raw?.state || '',
    postalCode: raw?.postalCode || raw?.pincode || '',
    country: raw?.country || 'India',
    isDefaultShipping: false,
    isDefaultBilling: false,
  };
};

const mapItem = (raw: any): OrderItem => {
  const productRaw = (typeof raw?.productId === 'object' && raw.productId) || raw?.product || null;
  const variant = (typeof raw?.variantId === 'object' && raw.variantId) || raw?.variant || null;
  const snapshot = raw?.productSnapshot || raw?.snapshot || {};
  const attrs = raw?.attributes || raw?.variantAttributes || variant?.attributes || snapshot?.attributes || {};
  const unitPrice = num(raw?.unitPrice, raw?.price, raw?.pricing?.sellingPrice, snapshot?.price);
  const imageUrl =
    (typeof raw?.image === 'string' ? raw.image : raw?.image?.url) ||
    snapshot?.image ||
    snapshot?.images?.[0]?.url;

  const product = mapStoreProduct({
    ...(productRaw || {}),
    _id: productRaw?._id || productRaw?.id || raw?.productId || '',
    name: productRaw?.name || raw?.productName || snapshot?.name || raw?.name || 'Product',
    sku: raw?.sku || variant?.sku || productRaw?.sku,
    images: productRaw?.images?.length ? productRaw.images : imageUrl ? [{ url: imageUrl, isPrimary: true }] : [],
    pricing: productRaw?.pricing || { sellingPrice: unitPrice, mrp: num(raw?.mrp, unitPrice) },
  });

  const colorName = attrs.color ? String(attrs.color) : '';
  const variantId = variant ? variant._id || variant.id : typeof raw?.variantId === 'string' ? raw.variantId : undefined;
  return {
    product,
    variantId,
    hasImage: !!(productRaw?.images?.length || imageUrl),
    selectedSize: attrs.size ? String(attrs.size) : '',
    selectedColor: colorName ? { name: colorName, hex: colorHex(colorName) || '#D9C9B4' } : NO_COLOR,
    quantity: num(raw?.quantity, raw?.qty) || 1,
    unitPrice,
    mrp: num(raw?.mrp, variant?.pricing?.mrp, unitPrice),
    sku: raw?.sku || variant?.sku || product.sku || '',
  };
};

const buildMilestones = (history: any[], currentRaw: string): TrackingMilestone[] => {
  const sorted = [...history].sort(
    (a, b) => new Date(a?.changedAt || a?.createdAt || a?.timestamp || 0).getTime() - new Date(b?.changedAt || b?.createdAt || b?.timestamp || 0).getTime()
  );
  // Newest first, as the tracking timeline expects
  return sorted.reverse().map((h, i) => ({
    status: prettyStatus(h?.status || h?.to),
    location: h?.location || '',
    timestamp: formatDateTime(h?.changedAt || h?.createdAt || h?.timestamp),
    description: h?.note || h?.reason || '',
    completed: true,
    current: i === 0 && toBackendStatus(h?.status || h?.to || '') === toBackendStatus(currentRaw),
  }));
};

/** Maps a backend order (list or detail shape) onto the UI Order type */
export const mapOrder = (raw: any): Order => {
  const rawStatus = String(raw?.status || raw?.orderStatus || 'PENDING');
  const pricing = raw?.pricing || raw?.summary || raw?.totals || raw || {};
  const customerRaw = (typeof raw?.customerId === 'object' && raw.customerId) || raw?.customer || {};
  const addressRaw = raw?.shippingAddress || raw?.address || raw?.deliveryAddress || {};
  const shippingAddress = mapAddress(addressRaw);
  const payment = raw?.payment || {};
  const shipment = raw?.shipment || raw?.shipping || raw?.tracking || {};
  const history: any[] = raw?.statusHistory || raw?.history || raw?.timeline || [];

  const trackingNumber = shipment?.trackingNumber || raw?.trackingNumber || shipment?.awb;
  const carrier = shipment?.carrier || shipment?.shippingCarrier || raw?.shippingCarrier;

  const name =
    customerRaw?.displayName ||
    [customerRaw?.firstName, customerRaw?.lastName].filter(Boolean).join(' ') ||
    customerRaw?.name ||
    shippingAddress.fullName;
  const customerPhone =
    typeof customerRaw?.phone === 'object' && customerRaw.phone
      ? `${customerRaw.phone.countryCode || ''} ${customerRaw.phone.number || ''}`.trim()
      : customerRaw?.phone || `${shippingAddress.phone.countryCode} ${shippingAddress.phone.number}`.trim();

  const placedAt = raw?.placedAt || raw?.createdAt;

  return {
    id: raw?._id || raw?.id || '',
    orderNumber: raw?.orderNumber || raw?.orderNo || raw?.code || `#${String(raw?._id || raw?.id || '').slice(-8).toUpperCase()}`,
    date: formatDate(placedAt),
    placedAt,
    rawStatus,
    customer: {
      id: customerRaw?._id || customerRaw?.id || (typeof raw?.customerId === 'string' ? raw.customerId : ''),
      name: name || 'Customer',
      email: customerRaw?.email || raw?.email || '',
      phone: customerPhone,
    },
    shippingAddress,
    billingAddress: raw?.billingAddress ? mapAddress(raw.billingAddress) : undefined,
    items: Array.isArray(raw?.items) ? raw.items.map(mapItem) : [],
    subtotal: num(pricing?.subtotal, raw?.subtotal),
    shippingFee: num(pricing?.shippingAmount, pricing?.shipping, pricing?.shippingFee, raw?.shippingAmount),
    discount:
      num(pricing?.couponDiscount, 0) + num(pricing?.promotionDiscount, 0) + num(pricing?.productDiscount, 0) ||
      num(pricing?.discountAmount, pricing?.totalDiscount, pricing?.discount, raw?.discountAmount, raw?.discount),
    couponCode: raw?.couponCode || pricing?.couponCode,
    tax: num(pricing?.taxAmount, pricing?.tax, raw?.taxAmount),
    total: num(pricing?.totalAmount, pricing?.total, pricing?.grandTotal, raw?.totalAmount, raw?.total),
    paymentMethod: toPaymentMethod(payment?.method || raw?.paymentMethod),
    paymentStatus: PAYMENT_STATUS[String(payment?.status || raw?.paymentStatus || 'PENDING').toUpperCase()] || 'Pending',
    orderStatus: toUiStatus(rawStatus),
    tracking:
      trackingNumber || carrier || history.length
        ? {
            awb: trackingNumber || '',
            courier: carrier || '',
            courierService: shipment?.service || '',
            estimatedDelivery: formatDate(shipment?.estimatedDelivery || raw?.estimatedDelivery) || '',
            currentStatus: prettyStatus(rawStatus),
            trackingUrl: shipment?.trackingUrl,
            milestones: buildMilestones(history, rawStatus),
          }
        : undefined,
    notes: raw?.notes || raw?.note,
    activityHistory: history.map(h => ({
      timestamp: formatDateTime(h?.changedAt || h?.createdAt || h?.timestamp),
      user: h?.changedByName || (h?.actorType ? prettyStatus(h.actorType) : '') || h?.actor || (h?.changedBy ? 'Admin' : 'System'),
      action: `Status: ${prettyStatus(h?.status || h?.to)}`,
      note: h?.note || h?.reason,
    })),
  };
};

const mapList = (response: any, fallbackLimit: number): OrderList => {
  const data = unwrap(response);
  // { data: [...], meta: { total, page, limit } } or { data: { orders, total, ... } }
  const meta = response?.data?.meta || data?.meta || data?.pagination || (Array.isArray(data) ? {} : data) || {};
  const list = Array.isArray(data) ? data : data?.orders || data?.items || data?.docs || [];
  const orders = Array.isArray(list) ? list.map(mapOrder) : [];
  return {
    orders,
    total: typeof meta.total === 'number' ? meta.total : orders.length,
    page: meta.page ?? 1,
    limit: meta.limit ?? fallbackLimit,
  };
};

// ── Catalog enrichment ────────────────────────────────────────────────────────
// Order lines only store ids (the name is a "Product" placeholder and there is no image,
// colour or size), so fill those in from the product catalog when available.

export interface OrderCatalogInfo {
  name?: string;
  image?: string;
  color?: string;
  size?: string;
}

export type OrderCatalogLookup = (productId: string, variantId?: string) => OrderCatalogInfo | undefined;

export const enrichOrder = (order: Order, lookup: OrderCatalogLookup): Order => ({
  ...order,
  items: order.items.map(item => {
    const info = lookup(item.product.id, item.variantId);
    if (!info) return item;
    const placeholderName = !item.product.name || item.product.name === 'Product';
    const colorName = item.selectedColor?.name || info.color || '';
    return {
      ...item,
      product: {
        ...item.product,
        name: placeholderName && info.name ? info.name : item.product.name,
        images: !item.hasImage && info.image ? { ...item.product.images, primary: info.image } : item.product.images,
      },
      selectedSize: item.selectedSize || info.size || '',
      selectedColor: item.selectedColor?.name
        ? item.selectedColor
        : colorName
        ? { name: colorName, hex: colorHex(colorName) || '#D9C9B4' }
        : item.selectedColor,
    };
  }),
});

const cleanParams = (params?: OrderListParams) =>
  Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '' && v !== 'All'));

export const orderErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error?.details?.[0]?.message || error?.response?.data?.message || fallback;

// ── Customer ──────────────────────────────────────────────────────────────────

/** GET /orders */
export const getMyOrders = async (params: OrderListParams = {}): Promise<OrderList> => {
  const limit = params.limit ?? 20;
  const response = await api.get('/orders', { params: cleanParams({ ...params, limit }) });
  return mapList(response, limit);
};

/** GET /orders/{orderId} */
export const getMyOrder = async (orderId: string): Promise<Order> => {
  const response = await api.get(`/orders/${orderId}`);
  return mapOrder(unwrap(response));
};

/** POST /orders/{orderId}/cancel */
export const cancelMyOrder = async (orderId: string, reason: string, note?: string): Promise<Order | null> => {
  const response = await api.post(`/orders/${orderId}/cancel`, { reason, ...(note ? { note } : {}) });
  const data = unwrap(response);
  return data && (data._id || data.id) ? mapOrder(data) : null;
};

// ── Admin ─────────────────────────────────────────────────────────────────────

/** GET /admin/orders */
export const getAdminOrders = async (params: OrderListParams = {}): Promise<OrderList> => {
  const limit = params.limit ?? 20;
  const response = await adminApi.get('/admin/orders', { params: cleanParams({ ...params, limit }) });
  return mapList(response, limit);
};

/** GET /admin/orders/{orderId} */
export const getAdminOrder = async (orderId: string): Promise<Order> => {
  const response = await adminApi.get(`/admin/orders/${orderId}`);
  return mapOrder(unwrap(response));
};

/** PATCH /admin/orders/{orderId}/status */
export const updateAdminOrderStatus = async (orderId: string, payload: StatusUpdatePayload): Promise<Order | null> => {
  const body: StatusUpdatePayload = { status: payload.status };
  if (payload.note) body.note = payload.note;
  if (payload.trackingNumber) body.trackingNumber = payload.trackingNumber;
  if (payload.shippingCarrier) body.shippingCarrier = payload.shippingCarrier;
  const response = await adminApi.patch(`/admin/orders/${orderId}/status`, body);
  const data = unwrap(response);
  return data && (data._id || data.id) ? mapOrder(data) : null;
};

/** POST /admin/orders/{orderId}/cancel */
export const cancelAdminOrder = async (orderId: string, reason: string, note?: string): Promise<Order | null> => {
  const response = await adminApi.post(`/admin/orders/${orderId}/cancel`, { reason, ...(note ? { note } : {}) });
  const data = unwrap(response);
  return data && (data._id || data.id) ? mapOrder(data) : null;
};
