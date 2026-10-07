import api from './api';
import adminApi from './adminApi';
import { firstNumber } from '../utils/number';

// -----------------------------------------------------------------------------
// Abandoned cart endpoints
// Admin:    GET /admin/abandoned-carts?page&limit&status&customerId
//           GET /admin/abandoned-carts/{id}
//           POST /admin/abandoned-carts/{id}/suppress   (stop reminders for this cart)
// Customer: GET /abandoned-cart/status
// -----------------------------------------------------------------------------

export interface AbandonedCartItem {
  productId?: string;
  variantId?: string;
  name: string;
  sku?: string;
  image?: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
}

export interface AbandonedCartReminder {
  channel: string;
  sentAt: string;
  status?: string;
}

export interface AbandonedCartRecord {
  id: string;
  cartId?: string;
  status: string;
  customer: { id?: string; name: string; email?: string; phone?: string };
  items: AbandonedCartItem[];
  itemCount: number;
  cartValue: number;
  currency: string;
  lastActivityAt?: string;
  abandonedAt?: string;
  recoveredAt?: string;
  suppressedAt?: string;
  reminders: AbandonedCartReminder[];
}

export interface AbandonedCartList {
  carts: AbandonedCartRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface AbandonedCartStatus {
  /** True when the customer has a cart the backend considers abandoned */
  isAbandoned: boolean;
  status?: string;
  itemCount: number;
  cartValue?: number;
  lastActivityAt?: string;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

export const abandonedCartErrorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error?.details?.[0]?.message || error?.response?.data?.message || fallback;

const idOf = (v: any) => (v && typeof v === 'object' ? v._id || v.id : v);

const mapItem = (raw: any): AbandonedCartItem => {
  const product = typeof raw?.productId === 'object' && raw.productId ? raw.productId : raw?.product;
  const variant = typeof raw?.variantId === 'object' && raw.variantId ? raw.variantId : raw?.variant;
  const attrs = raw?.attributes || variant?.attributes || {};
  const images: any[] = variant?.images || product?.images || [];
  return {
    productId: idOf(raw?.productId),
    variantId: idOf(raw?.variantId),
    name: product?.name || raw?.name || raw?.productName || 'Product',
    sku: raw?.sku || variant?.sku,
    image: raw?.image?.url || raw?.image || images.find((i: any) => i?.isPrimary)?.url || images[0]?.url,
    color: attrs.color,
    size: attrs.size,
    quantity: firstNumber(raw?.quantity, raw?.qty) ?? 1,
    unitPrice:
      firstNumber(raw?.unitPrice, raw?.price, raw?.priceSnapshot?.sellingPrice, variant?.pricing?.sellingPrice, product?.pricing?.sellingPrice) ?? 0,
  };
};

export const mapAbandonedCart = (raw: any): AbandonedCartRecord => {
  const cart = typeof raw?.cartId === 'object' && raw.cartId ? raw.cartId : raw?.cart || raw?.cartSnapshot || raw?.snapshot || {};
  const customerRaw = typeof raw?.customerId === 'object' && raw.customerId ? raw.customerId : raw?.customer || {};
  const rawItems: any[] = raw?.items || cart?.items || [];
  const items = Array.isArray(rawItems) ? rawItems.map(mapItem) : [];
  const itemsTotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const phone = customerRaw?.phone;
  const reminders: any[] = raw?.reminders || raw?.remindersSent || raw?.notifications || [];

  return {
    id: raw?._id || raw?.id || '',
    cartId: idOf(raw?.cartId) || cart?._id,
    status: String(raw?.status || 'ABANDONED'),
    customer: {
      id: idOf(raw?.customerId) || customerRaw?._id,
      name:
        customerRaw?.displayName ||
        [customerRaw?.firstName, customerRaw?.lastName].filter(Boolean).join(' ') ||
        customerRaw?.name ||
        raw?.customerName ||
        customerRaw?.email ||
        raw?.email ||
        'Customer',
      email: customerRaw?.email || raw?.email,
      phone:
        typeof phone === 'object' && phone
          ? `${phone.countryCode || ''} ${phone.number || ''}`.trim()
          : phone || raw?.phone || raw?.phoneNumber,
    },
    items,
    itemCount: firstNumber(raw?.itemCount, cart?.itemCount) ?? items.reduce((s, i) => s + i.quantity, 0),
    cartValue:
      firstNumber(raw?.cartValue, raw?.cartTotal, raw?.totalValue, raw?.subtotal, cart?.totals?.subtotal, cart?.subtotal, cart?.total) ?? itemsTotal,
    currency: raw?.currency || cart?.currency || 'INR',
    lastActivityAt: raw?.lastActivityAt || raw?.lastActiveAt || cart?.updatedAt || raw?.updatedAt,
    abandonedAt: raw?.abandonedAt || raw?.detectedAt || raw?.createdAt,
    recoveredAt: raw?.recoveredAt,
    suppressedAt: raw?.suppressedAt,
    reminders: Array.isArray(reminders)
      ? reminders.map((r: any) => ({
          channel: r?.channel || r?.type || 'Reminder',
          sentAt: r?.sentAt || r?.createdAt || r?.at || '',
          status: r?.status,
        }))
      : [],
  };
};

const mapList = (response: any, fallbackLimit: number): AbandonedCartList => {
  const data = unwrap(response);
  const meta = response?.data?.meta || data?.meta || data?.pagination || (Array.isArray(data) ? {} : data) || {};
  const list = Array.isArray(data) ? data : data?.carts || data?.abandonedCarts || data?.items || data?.docs || [];
  const carts = Array.isArray(list) ? list.map(mapAbandonedCart) : [];
  return {
    carts,
    total: typeof meta.total === 'number' ? meta.total : carts.length,
    page: meta.page ?? 1,
    limit: meta.limit ?? fallbackLimit,
  };
};

// ── Admin ─────────────────────────────────────────────────────────────────────

/** GET /admin/abandoned-carts */
export const getAdminAbandonedCarts = async (
  params: { page?: number; limit?: number; status?: string; customerId?: string } = {}
): Promise<AbandonedCartList> => {
  const limit = params.limit ?? 20;
  const query = Object.fromEntries(Object.entries({ ...params, limit }).filter(([, v]) => v !== undefined && v !== ''));
  const response = await adminApi.get('/admin/abandoned-carts', { params: query });
  return mapList(response, limit);
};

/** GET /admin/abandoned-carts/{id} */
export const getAdminAbandonedCart = async (id: string): Promise<AbandonedCartRecord> => {
  const response = await adminApi.get(`/admin/abandoned-carts/${id}`);
  return mapAbandonedCart(unwrap(response));
};

/** POST /admin/abandoned-carts/{id}/suppress — stop recovery reminders for this cart */
export const suppressAbandonedCart = async (id: string): Promise<AbandonedCartRecord | null> => {
  const response = await adminApi.post(`/admin/abandoned-carts/${id}/suppress`);
  const data = unwrap(response);
  return data && (data._id || data.id) ? mapAbandonedCart(data) : null;
};

// ── Customer ──────────────────────────────────────────────────────────────────

/** GET /abandoned-cart/status */
export const getMyAbandonedCartStatus = async (): Promise<AbandonedCartStatus> => {
  const response = await api.get('/abandoned-cart/status');
  const data = unwrap(response) || {};
  const status = data.status ? String(data.status) : undefined;
  return {
    isAbandoned: !!(data.isAbandoned ?? data.abandoned ?? data.hasAbandonedCart ?? (status && /ABANDON|REMIND/i.test(status))),
    status,
    itemCount: firstNumber(data.itemCount, data.items?.length) ?? 0,
    cartValue: firstNumber(data.cartValue, data.cartTotal, data.subtotal),
    lastActivityAt: data.lastActivityAt || data.updatedAt,
  };
};
