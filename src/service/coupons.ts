import api from './api';
import adminApi from './adminApi';
import type { Coupon } from '../types';
import { firstNumber } from '../utils/number';

// -----------------------------------------------------------------------------
// Coupon endpoints
// Customer: POST /coupons/validate
// Admin:    GET /admin/coupons, POST /admin/coupons
// -----------------------------------------------------------------------------

/** Body for POST /admin/coupons (CouponInput in the API docs) */
export interface CouponInput {
  code: string;
  description?: string;
  discount: {
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    maxDiscountAmount?: number;
  };
  startsAt?: string;
  expiresAt?: string;
  /** Not in the documented schema, but the backend stores it and defaults to DRAFT */
  status?: 'ACTIVE' | 'DRAFT';
}

export interface CouponValidationResult {
  valid: boolean;
  message: string;
  /** Discount amount the backend calculated for this cart */
  discountAmount: number;
  coupon: Coupon | null;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const num = firstNumber;

const errorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.error?.details?.[0]?.message || error?.response?.data?.message || fallback;

const toDateOnly = (value?: string) => (value ? String(value).split('T')[0] : '');

const mapStatus = (raw: any): Coupon['status'] => {
  const s = String(raw.status || '').toUpperCase();
  const expired = raw.expiresAt && new Date(raw.expiresAt).getTime() < Date.now();
  if (s === 'EXPIRED' || expired) return 'Expired';
  if (s === 'DRAFT') return 'Draft';
  if (s === 'PAUSED' || s === 'INACTIVE' || raw.isActive === false) return 'Paused';
  return 'Active';
};

/** Maps a backend coupon ({ discount: { type, value, maxDiscountAmount }, startsAt, expiresAt, ... }) to the UI type */
export const mapCoupon = (raw: any): Coupon => {
  const discount = raw?.discount || {};
  const type = String(discount.type || raw?.discountType || '').toUpperCase();
  return {
    id: raw?.id || raw?._id || raw?.code,
    code: raw?.code || '',
    description: raw?.description || '',
    discountType: type === 'FIXED' ? 'Fixed' : 'Percentage',
    discountValue: num(discount.value, raw?.discountValue) ?? 0,
    maxDiscount: num(discount.maxDiscountAmount, raw?.maxDiscount),
    minOrderValue: num(raw?.minOrderValue, raw?.minCartValue, raw?.conditions?.minCartValue, raw?.minimumAmount) ?? 0,
    usageLimit: num(raw?.usageLimit, raw?.limits?.total),
    usageCount: num(raw?.usageCount, raw?.usedCount, raw?.timesUsed) ?? 0,
    perCustomerLimit: num(raw?.perCustomerLimit, raw?.limits?.perCustomer),
    startDate: toDateOnly(raw?.startsAt || raw?.startDate),
    endDate: toDateOnly(raw?.expiresAt || raw?.endDate),
    status: mapStatus(raw || {}),
  };
};

/** POST /coupons/validate — checks a code against the customer's cart and returns the discount */
export const validateCoupon = async (code: string, cartId: string): Promise<CouponValidationResult> => {
  try {
    const response = await api.post('/coupons/validate', { code, cartId });
    const data = unwrap(response) || {};
    const couponRaw = data.coupon || (data.code ? data : null);
    const discountAmount =
      num(data.discountAmount, data.discount, data.totalDiscount, data.discount?.amount, data.pricing?.discount) ?? 0;
    const valid = data.valid ?? data.isValid ?? true;
    return {
      valid: !!valid,
      message: response?.data?.message || (valid ? 'Coupon applied' : 'This coupon cannot be applied'),
      discountAmount,
      coupon: couponRaw ? mapCoupon(couponRaw) : null,
    };
  } catch (error: any) {
    // 400 = the code is invalid / expired / not eligible for this cart
    if (error.response && error.response.status < 500) {
      return { valid: false, message: errorMessage(error, 'Invalid or expired coupon code'), discountAmount: 0, coupon: null };
    }
    throw error;
  }
};

const PAGE_SIZE = 50;
const MAX_PAGES = 20;

/**
 * GET /admin/coupons — paginated ({ coupons, total, page, limit }), so all pages are fetched.
 */
export const getAdminCoupons = async (): Promise<Coupon[]> => {
  const all: Coupon[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const response = await adminApi.get('/admin/coupons', { params: { page, limit: PAGE_SIZE } });
    const data = unwrap(response);
    const list = Array.isArray(data) ? data : data?.coupons || data?.items || [];
    if (!Array.isArray(list)) break;
    all.push(...list.map(mapCoupon));

    const total = typeof data?.total === 'number' ? data.total : undefined;
    const limit = typeof data?.limit === 'number' ? data.limit : PAGE_SIZE;
    // Stop when the server says we have everything, or when a page comes back short
    if (Array.isArray(data) || total === undefined || all.length >= total || list.length < limit) break;
  }
  return all;
};

/** POST /admin/coupons */
export const createAdminCoupon = async (input: CouponInput): Promise<Coupon> => {
  const response = await adminApi.post('/admin/coupons', input);
  return mapCoupon(unwrap(response));
};

/**
 * PATCH /admin/coupons/{id} — edit a coupon.
 * (Exists on the backend but is not in the Swagger docs yet.)
 */
export const updateAdminCoupon = async (id: string, input: Partial<CouponInput>): Promise<Coupon | null> => {
  const response = await adminApi.patch(`/admin/coupons/${id}`, input);
  const data = unwrap(response);
  return data && (data._id || data.id) ? mapCoupon(data) : null;
};

/** DELETE /admin/coupons/{id} (undocumented) */
export const deleteAdminCoupon = async (id: string): Promise<void> => {
  await adminApi.delete(`/admin/coupons/${id}`);
};

/**
 * Change a coupon's status via PATCH /admin/coupons/{id}/status (undocumented).
 * The exact status names aren't documented, so for "off" a few common values are tried in turn,
 * and the plain PATCH /admin/coupons/{id} is used if the status route rejects the request.
 */
export const setAdminCouponStatus = async (id: string, active: boolean): Promise<Coupon | null> => {
  const candidates = active ? ['ACTIVE'] : ['INACTIVE', 'PAUSED', 'DRAFT'];
  let lastError: any;
  for (const status of candidates) {
    for (const request of [
      () => adminApi.patch(`/admin/coupons/${id}/status`, { status }),
      () => adminApi.patch(`/admin/coupons/${id}`, { status }),
    ]) {
      try {
        const response = await request();
        const data = unwrap(response);
        return data && (data._id || data.id) ? mapCoupon(data) : null;
      } catch (err: any) {
        lastError = err;
        const code = err?.response?.status;
        // Only fall through on "this value / route isn't accepted"; stop on auth or server errors
        if (code !== 400 && code !== 404 && code !== 422) throw err;
      }
    }
  }
  throw lastError;
};

export { errorMessage as couponErrorMessage };
