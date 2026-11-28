import adminApi from './adminApi';
import { getBackendErrorMessage } from '../utils/apiResponse';
import { firstNumber } from '../utils/number';
import type {
  AdminPromotion,
  PromotionInput,
  PromotionStatus,
  PromotionApplicableTo,
  PromotionScopeType,
  PromotionBackgroundImage,
} from '../types/promotion';

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

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * Stored UTC datetime -> the admin's local calendar date ("YYYY-MM-DD").
 * The form saves local midnight / local end of day, so in IST 18 Nov 00:00 is stored as
 * 2026-11-17T18:30:00.000Z. Taking the text before "T" (the previous behavior) showed
 * 17 Nov and moved the date back a day on every unchanged save; formatting in local
 * time gives back the date the admin picked.
 */
const toDateOnly = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split('T')[0];
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

/** "2026-01-01" (date-only, from an <input type="date">) -> a full ISO datetime string. */
const toIsoDateTime = (value: string): string => new Date(`${value}T00:00:00`).toISOString();

/** "2026-01-01" -> ISO datetime for the end of that local day (23:59:59), same as coupons. */
const toIsoEndOfDay = (value: string): string => new Date(`${value}T23:59:59`).toISOString();

const SCOPE_TYPES: PromotionScopeType[] = ['ALL', 'PRODUCTS', 'CATEGORIES', 'COLLECTIONS'];

/** Ids may come back as strings or populated objects ({ _id, name }). */
const toIdList = (value: any): string[] =>
  Array.isArray(value)
    ? value.map((v: any) => (typeof v === 'string' ? v : String(v?._id || v?.id || ''))).filter(Boolean)
    : [];

/** Admin Promotion Management only; absent/invalid -> undefined (no background image). */
const mapBackgroundImage = (raw: any): PromotionBackgroundImage | undefined => {
  const img = raw?.backgroundImage;
  if (!img || !img.url) return undefined;
  return {
    url: img.url,
    thumbnailUrl: img.thumbnailUrl,
    publicId: img.publicId,
    alt: img.alt,
    width: num(img.width),
    height: num(img.height),
  };
};

/** Older promotions may have no `applicableTo` at all — treated as ALL with empty lists. */
const mapApplicableTo = (raw: any): PromotionApplicableTo => {
  const a = raw?.applicableTo || {};
  const type = String(a.type || '').toUpperCase() as PromotionScopeType;
  return {
    type: SCOPE_TYPES.includes(type) ? type : 'ALL',
    productIds: toIdList(a.productIds ?? a.products),
    categoryIds: toIdList(a.categoryIds ?? a.categories),
    collectionIds: toIdList(a.collectionIds ?? a.collections),
  };
};

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
    // The form's "Conditions" is saved as `description` (the field in the Swagger schema)
    conditions: raw?.description || raw?.conditions || '',
    discountType: discountType === 'FIXED' ? 'Fixed' : 'Percentage',
    discountValue: num(discount.value, raw?.discountValue) ?? 0,
    maxDiscountAmount: num(discount.maxDiscountAmount, raw?.maxDiscountAmount, raw?.maxDiscount),
    minimumOrderValue: num(raw?.minimumOrderValue, raw?.minOrderValue),
    startDate: toDateOnly(raw?.startsAt || raw?.startDate),
    endDate: toDateOnly(raw?.expiresAt || raw?.endDate),
    status: mapStatus(raw),
    eligibleCategories: Array.isArray(raw?.eligibleCategories)
      ? raw.eligibleCategories
      : Array.isArray(raw?.categories)
        ? raw.categories
        : [],
    applicableTo: mapApplicableTo(raw),
    excludedProducts: toIdList(raw?.excludedProducts),
    excludedCategories: toIdList(raw?.excludedCategories),
    priority: Number.isInteger(Number(raw?.priority)) ? Number(raw.priority) : 0,
    backgroundImage: mapBackgroundImage(raw),
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

export { toIsoDateTime, toIsoEndOfDay };
