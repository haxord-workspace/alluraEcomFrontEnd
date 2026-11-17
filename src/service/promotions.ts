import adminApi from './adminApi';
import { getBackendErrorMessage } from '../utils/apiResponse';
import { firstNumber } from '../utils/number';
import type { AdminPromotion, PromotionInput, PromotionStatus } from '../types/promotion';

// -----------------------------------------------------------------------------
// Admin Promotions endpoints (Swagger: "Promotions (Admin)")
// GET    /admin/promotions              list
// POST   /admin/promotions              create
// GET    /admin/promotions/{id}         detail
// PATCH  /admin/promotions/{id}         update
// DELETE /admin/promotions/{id}         delete
// PATCH  /admin/promotions/{id}/status  status change
// -----------------------------------------------------------------------------

export interface PromotionListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PromotionList {
  promotions: AdminPromotion[];
  total: number;
  page: number;
  limit: number;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const num = firstNumber;

const toDateOnly = (value?: string) => (value ? String(value).split('T')[0] : '');

/** "2026-01-01" (date-only, from an <input type="date">) -> a full ISO datetime string. */
const toIsoDateTime = (value: string): string => new Date(`${value}T00:00:00`).toISOString();

/** UI status -> the real backend enum (DRAFT|ACTIVE|INACTIVE|EXPIRED), confirmed by the
 *  backend's own validation error on POST /admin/promotions. */
export const toBackendPromotionStatus = (status: PromotionStatus): 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED' => {
  if (status === 'Paused') return 'INACTIVE';
  if (status === 'Draft') return 'DRAFT';
  if (status === 'Expired') return 'EXPIRED';
  return 'ACTIVE';
};

const mapStatus = (raw: any): PromotionStatus => {
  const s = String(raw?.status || '').toUpperCase();
  const expired = raw?.expiresAt && new Date(raw.expiresAt).getTime() < Date.now();
  if (s === 'EXPIRED' || expired) return 'Expired';
  if (s === 'DRAFT') return 'Draft';
  if (s === 'INACTIVE' || s === 'PAUSED' || raw?.isActive === false) return 'Paused';
  return 'Active';
};

/** Maps a backend promotion ({ discount: { type, value, maxDiscountAmount }, startsAt,
 *  expiresAt, ... }, same shape as coupons) to the UI type. Tolerant of a few likely
 *  field-name variants. */
export const mapPromotion = (raw: any): AdminPromotion => {
  const discount = raw?.discount || {};
  const discountType = String(discount.type || raw?.discountType || '').toUpperCase();
  return {
    id: raw?.id || raw?._id || '',
    name: raw?.name || raw?.title || '',
    type: raw?.type || raw?.promotionType || 'Tiered Discount',
    conditions: raw?.conditions || raw?.description || '',
    discountType: discountType === 'FIXED' ? 'Fixed' : 'Percentage',
    discountValue: num(discount.value, raw?.discountValue) ?? 0,
    maxDiscountAmount: num(discount.maxDiscountAmount, raw?.maxDiscountAmount, raw?.maxDiscount),
    startDate: toDateOnly(raw?.startsAt || raw?.startDate),
    endDate: toDateOnly(raw?.expiresAt || raw?.endDate),
    status: mapStatus(raw),
    eligibleCategories: Array.isArray(raw?.eligibleCategories)
      ? raw.eligibleCategories
      : Array.isArray(raw?.categories)
        ? raw.categories
        : [],
  };
};

const cleanParams = (params?: PromotionListParams) =>
  Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '' && v !== 'All'));

const mapList = (response: any, fallbackLimit: number): PromotionList => {
  const data = unwrap(response);
  const meta = response?.data?.meta || data?.meta || data?.pagination || (Array.isArray(data) ? {} : data) || {};
  const list = Array.isArray(data) ? data : data?.promotions || data?.items || data?.docs || [];
  const promotions = Array.isArray(list) ? list.map(mapPromotion) : [];
  return {
    promotions,
    total: typeof meta.total === 'number' ? meta.total : promotions.length,
    page: meta.page ?? 1,
    limit: meta.limit ?? fallbackLimit,
  };
};

/** GET /admin/promotions */
export const getPromotions = async (params: PromotionListParams = {}): Promise<PromotionList> => {
  const limit = params.limit ?? 20;
  const response = await adminApi.get('/admin/promotions', { params: cleanParams({ ...params, limit }) });
  return mapList(response, limit);
};

/** GET /admin/promotions/{id} */
export const getPromotion = async (id: string): Promise<AdminPromotion> => {
  const response = await adminApi.get(`/admin/promotions/${id}`);
  return mapPromotion(unwrap(response));
};

/** POST /admin/promotions */
export const createPromotion = async (input: PromotionInput): Promise<AdminPromotion> => {
  const response = await adminApi.post('/admin/promotions', input);
  return mapPromotion(unwrap(response));
};

/** PATCH /admin/promotions/{id} */
export const updatePromotion = async (id: string, input: Partial<PromotionInput>): Promise<AdminPromotion | null> => {
  const response = await adminApi.patch(`/admin/promotions/${id}`, input);
  const data = unwrap(response);
  return data && (data._id || data.id) ? mapPromotion(data) : null;
};

/** DELETE /admin/promotions/{id} */
export const deletePromotion = async (id: string): Promise<void> => {
  await adminApi.delete(`/admin/promotions/${id}`);
};

/** PATCH /admin/promotions/{id}/status */
export const updatePromotionStatus = async (id: string, status: PromotionStatus): Promise<AdminPromotion | null> => {
  const response = await adminApi.patch(`/admin/promotions/${id}/status`, { status: toBackendPromotionStatus(status) });
  const data = unwrap(response);
  return data && (data._id || data.id) ? mapPromotion(data) : null;
};

export const promotionErrorMessage = (error: any, fallback: string): string =>
  getBackendErrorMessage(error, fallback);

export { toIsoDateTime };
