import api from './api';
import adminApi from './adminApi';
import { getBackendErrorMessage } from '../utils/apiResponse';
import type {
  SalesAnalyticsParams,
  SalesAnalytics,
  ProductAnalyticsParams,
  ProductAnalyticsItem,
  ProductAnalyticsResponse,
  AnalyticsDateRangeParams,
  FunnelAnalytics,
  TrackingStatus,
  ClientAnalyticsEvent,
} from '../types/analytics';

// -----------------------------------------------------------------------------
// Analytics (Admin Reporting) + client event ingestion (Swagger confirmed, see
// src/types/analytics.ts):
//   GET /admin/analytics/sales, /products, /funnel, /tracking-status
//   POST /analytics/events (public, rate-limited)
// -----------------------------------------------------------------------------

export const analyticsErrorMessage = (error: any, fallback: string): string =>
  getBackendErrorMessage(error, fallback);

const unwrap = (response: any) => response?.data?.data ?? response?.data;

/** GET /admin/analytics/sales */
export const getSalesAnalytics = async (params: SalesAnalyticsParams = {}): Promise<SalesAnalytics> => {
  const response = await adminApi.get('/admin/analytics/sales', { params });
  return unwrap(response);
};

/** Group key / label for products the backend returns without a category */
export const UNCATEGORIZED_ID = 'uncategorized';
export const UNCATEGORIZED_LABEL = 'Uncategorized';

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** One row of data.products, with missing / null numbers defaulted to 0 */
const normalizeProductAnalyticsItem = (raw: any): ProductAnalyticsItem => ({
  productId: String(raw?.productId ?? raw?.id ?? ''),
  name: raw?.name || 'Unnamed product',
  categoryId: raw?.categoryId ? String(raw.categoryId) : UNCATEGORIZED_ID,
  categoryName: raw?.categoryName || UNCATEGORIZED_LABEL,
  unitsSold: toNumber(raw?.unitsSold),
  grossRevenue: toNumber(raw?.grossRevenue),
  views: toNumber(raw?.views),
  addToCartCount: toNumber(raw?.addToCartCount),
  purchaseCount: toNumber(raw?.purchaseCount),
  conversionRate: toNumber(raw?.conversionRate),
  cartToPurchaseRate: toNumber(raw?.cartToPurchaseRate),
});

/** GET /admin/analytics/products — data.products is a flat product list */
export const getProductAnalytics = async (
  params: ProductAnalyticsParams = {},
  signal?: AbortSignal
): Promise<ProductAnalyticsResponse> => {
  const response = await adminApi.get('/admin/analytics/products', { params, signal });
  const data = unwrap(response);
  return {
    ...data,
    products: Array.isArray(data?.products) ? data.products.map(normalizeProductAnalyticsItem) : [],
    pagination: data?.pagination ?? undefined,
  };
};

/** GET /admin/analytics/funnel */
export const getFunnelAnalytics = async (params: AnalyticsDateRangeParams = {}): Promise<FunnelAnalytics> => {
  const response = await adminApi.get('/admin/analytics/funnel', { params });
  return unwrap(response);
};

/** GET /admin/analytics/tracking-status */
export const getTrackingStatus = async (params: AnalyticsDateRangeParams = {}): Promise<TrackingStatus> => {
  const response = await adminApi.get('/admin/analytics/tracking-status', { params });
  return unwrap(response);
};

/**
 * POST /analytics/events — public, rate-limited. Only PAGE_VIEW, VIEW_CONTENT
 * and VIEW_CART are accepted from the client; every other event is emitted by
 * backend call sites only, so it can never be spoofed by a frontend request.
 * Callers must treat this as fire-and-forget (see service/tracking.ts).
 */
export const trackClientEvent = (event: ClientAnalyticsEvent): Promise<void> =>
  api.post('/analytics/events', event).then(() => undefined);
