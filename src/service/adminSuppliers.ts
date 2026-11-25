// -----------------------------------------------------------------------------
// Supplier Management: admin service. Uses the shared `adminApi` instance, so
// admin auth, token refresh and request guards apply unchanged.
// Base path: /admin/suppliers. Responses follow the usual { data, meta } shape.
// -----------------------------------------------------------------------------

import axios from 'axios';
import adminApi from './adminApi';
import { buildQueryParams } from '../utils/queryParams';
import { getBackendErrorMessage, getBackendFieldErrors } from '../utils/apiResponse';
import { SUPPLIER_READY_METRICS, SUPPLIER_UNTRACKED_METRICS } from '../types/suppliers';
import type {
  AnalyticsDateRange,
  CreateSupplierPayload,
  Paginated,
  PaginationMeta,
  Supplier,
  SupplierAnalyticsOverview,
  SupplierApiError,
  SupplierDetails,
  SupplierListItem,
  SupplierListParams,
  SupplierMetric,
  SupplierPerformanceParams,
  SupplierPerformanceResult,
  SupplierPerformanceRow,
  SupplierProduct,
  SupplierProductsParams,
  SupplierRanking,
  SupplierRankingRow,
  SupplierSelectionItem,
  SupplierSelectionParams,
  SupplierSingleAnalytics,
  SupplierStatusChangeResult,
  SupplierTopParams,
  UpdateSupplierPayload,
  UpdateSupplierStatusPayload,
} from '../types/suppliers';

const BASE = '/admin/suppliers';
const seg = (id: string) => encodeURIComponent(id);

interface RequestOptions {
  signal?: AbortSignal;
}

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const toNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
};

/** The `data` field of the standard envelope (or the body itself) */
const unwrap = (body: unknown): unknown => (isRecord(body) && 'data' in body ? body.data : body);

const readMeta = (body: unknown, fallback: { page?: number; limit?: number; count: number }): PaginationMeta => {
  const meta = isRecord(body) && isRecord(body.meta) ? body.meta : {};
  const limit = toNumber(meta.limit, fallback.limit ?? 20) || 20;
  const total = toNumber(meta.total, fallback.count);
  return {
    total,
    page: toNumber(meta.page, fallback.page ?? 1) || 1,
    limit,
    totalPages: toNumber(meta.totalPages, Math.max(1, Math.ceil(total / limit))),
  };
};

const readList = <T,>(body: unknown, params: { page?: number; limit?: number }): Paginated<T> => {
  const data = unwrap(body);
  const list = (Array.isArray(data) ? data : []) as T[];
  return { data: list, meta: readMeta(body, { ...params, count: list.length }) };
};

const readMessage = (body: unknown): string | undefined =>
  isRecord(body) && typeof body.message === 'string' && body.message.trim() ? body.message.trim() : undefined;

// ── Errors ───────────────────────────────────────────────────────────────────

/** Normalizes an axios error into code, message, field errors and 409 details */
export const toSupplierApiError = (err: unknown, fallback = 'Request failed'): SupplierApiError => {
  const response = axios.isAxiosError(err) ? err.response : undefined;
  const body: unknown = response?.data;
  const errorObj = isRecord(body) && isRecord(body.error) ? body.error : undefined;
  const code =
    (typeof errorObj?.code === 'string' && errorObj.code) ||
    (isRecord(body) && typeof body.code === 'string' && body.code) ||
    undefined;
  const details = errorObj?.details ?? (isRecord(body) ? body.details : undefined);
  const firstDetail = Array.isArray(details) && isRecord(details[0]) ? details[0] : undefined;
  const linkedProducts = firstDetail && 'linkedProducts' in firstDetail ? toNumber(firstDetail.linkedProducts) : undefined;
  const status = response?.status;

  let message = getBackendErrorMessage(err, fallback);
  if (status === 403) message = "You don't have access to suppliers.";
  // A 409 detail carries linkedProducts, not a field message: prefer the top-level message
  if (code === 'SUPPLIER_HAS_PRODUCTS' && typeof errorObj?.message === 'string') message = errorObj.message;

  return {
    status,
    code,
    message,
    fieldErrors: code === 'VALIDATION_ERROR' || status === 400 || status === 422 ? getBackendFieldErrors(err) : {},
    linkedProducts,
  };
};

export const isRequestAborted = (err: unknown): boolean => axios.isCancel(err);

// ── Suppliers CRUD ───────────────────────────────────────────────────────────

/** GET /admin/suppliers: list, search, filter, sort */
export const getSuppliers = async (
  params: SupplierListParams = {},
  options: RequestOptions = {}
): Promise<Paginated<SupplierListItem>> => {
  const response = await adminApi.get(BASE, {
    params: buildQueryParams({
      search: params.search,
      status: params.status,
      supplierType: params.supplierType,
      hasProducts: params.hasProducts,
      minProducts: params.minProducts,
      maxProducts: params.maxProducts,
      createdFrom: params.createdFrom,
      createdTo: params.createdTo,
      sortBy: params.sortBy,
      page: params.page,
      limit: params.limit,
    }),
    signal: options.signal,
  });
  const result = readList<SupplierListItem>(response.data, params);
  return { ...result, data: result.data.map(s => ({ ...s, productCount: toNumber(s.productCount) })) };
};

/** POST /admin/suppliers */
export const createSupplier = async (payload: CreateSupplierPayload): Promise<{ supplier: Supplier; message?: string }> => {
  const response = await adminApi.post(BASE, payload);
  return { supplier: unwrap(response.data) as Supplier, message: readMessage(response.data) };
};

/** GET /admin/suppliers/selection: ACTIVE suppliers for the product form dropdown */
export const getSupplierSelection = async (
  params: SupplierSelectionParams = {},
  options: RequestOptions = {}
): Promise<SupplierSelectionItem[]> => {
  const response = await adminApi.get(`${BASE}/selection`, {
    params: buildQueryParams({ search: params.search, limit: params.limit ?? 20 }),
    signal: options.signal,
  });
  const data = unwrap(response.data);
  return Array.isArray(data) ? (data as SupplierSelectionItem[]) : [];
};

/** GET /admin/suppliers/:id: everything the details page needs */
export const getSupplierDetails = async (id: string, options: RequestOptions = {}): Promise<SupplierDetails> => {
  const response = await adminApi.get(`${BASE}/${seg(id)}`, { signal: options.signal });
  return unwrap(response.data) as SupplierDetails;
};

/** PATCH /admin/suppliers/:id: send only changed fields */
export const updateSupplier = async (
  id: string,
  payload: UpdateSupplierPayload
): Promise<{ supplier: Supplier; message?: string }> => {
  const response = await adminApi.patch(`${BASE}/${seg(id)}`, payload);
  return { supplier: unwrap(response.data) as Supplier, message: readMessage(response.data) };
};

/** PATCH /admin/suppliers/:id/status: meta carries linkedProducts and changed */
export const updateSupplierStatus = async (
  id: string,
  payload: UpdateSupplierStatusPayload
): Promise<SupplierStatusChangeResult> => {
  const reason = payload.reason?.trim();
  const response = await adminApi.patch(`${BASE}/${seg(id)}/status`, {
    status: payload.status,
    ...(reason ? { reason } : {}),
  });
  const meta = isRecord(response.data) && isRecord(response.data.meta) ? response.data.meta : {};
  return {
    supplier: unwrap(response.data) as Supplier,
    linkedProducts: toNumber(meta.linkedProducts),
    changed: meta.changed !== false,
    message: readMessage(response.data),
  };
};

/** DELETE /admin/suppliers/:id (soft delete). 409 SUPPLIER_HAS_PRODUCTS when products still use it. */
export const deleteSupplier = async (id: string): Promise<string | undefined> => {
  const response = await adminApi.delete(`${BASE}/${seg(id)}`);
  return readMessage(response.data);
};

/** GET /admin/suppliers/:id/products */
export const getSupplierProducts = async (
  id: string,
  params: SupplierProductsParams = {},
  options: RequestOptions = {}
): Promise<Paginated<SupplierProduct>> => {
  const response = await adminApi.get(`${BASE}/${seg(id)}/products`, {
    params: buildQueryParams({
      search: params.search,
      status: params.status,
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      page: params.page,
      limit: params.limit,
    }),
    signal: options.signal,
  });
  return readList<SupplierProduct>(response.data, params);
};

// ── Analytics ────────────────────────────────────────────────────────────────

const rangeParams = (range: AnalyticsDateRange) => ({ startDate: range.startDate, endDate: range.endDate });

/** GET /admin/suppliers/:id/analytics */
export const getSupplierAnalytics = async (
  id: string,
  range: AnalyticsDateRange = {},
  options: RequestOptions = {}
): Promise<SupplierSingleAnalytics> => {
  const response = await adminApi.get(`${BASE}/${seg(id)}/analytics`, {
    params: buildQueryParams(rangeParams(range)),
    signal: options.signal,
  });
  return unwrap(response.data) as SupplierSingleAnalytics;
};

/** GET /admin/suppliers/analytics/overview: counts only (always current, no date range) */
export const getSupplierAnalyticsOverview = async (options: RequestOptions = {}): Promise<SupplierAnalyticsOverview> => {
  const response = await adminApi.get(`${BASE}/analytics/overview`, { signal: options.signal });
  const data = unwrap(response.data) as SupplierAnalyticsOverview;
  return { ...data, distributionByStatus: Array.isArray(data?.distributionByStatus) ? data.distributionByStatus : [] };
};

const KNOWN_METRICS = new Set<string>([...SUPPLIER_READY_METRICS, ...SUPPLIER_UNTRACKED_METRICS]);

const toRanking = (metric: string, raw: unknown): SupplierRanking | null => {
  if (!KNOWN_METRICS.has(metric)) return null;
  const obj = isRecord(raw) ? raw : {};
  const rows = Array.isArray(raw) ? raw : Array.isArray(obj.data) ? obj.data : null;
  const available = obj.available !== false && rows !== null;
  return {
    metric: metric as SupplierMetric,
    available,
    definition: typeof obj.definition === 'string' ? obj.definition : undefined,
    data: available ? (rows as SupplierRankingRow[]) : null,
  };
};

/**
 * GET /admin/suppliers/analytics/top. Without `metric`, every ranking comes back in
 * `data.rankings` (keyed by metric, or as an array of { metric, ... }).
 */
export const getSupplierTopRankings = async (
  params: SupplierTopParams = {},
  options: RequestOptions = {}
): Promise<SupplierRanking[]> => {
  const response = await adminApi.get(`${BASE}/analytics/top`, {
    params: buildQueryParams({ ...rangeParams(params), metric: params.metric, limit: params.limit }),
    signal: options.signal,
  });
  const data = unwrap(response.data);
  const container = isRecord(data) && 'rankings' in data ? data.rankings : data;

  const rankings: SupplierRanking[] = [];
  if (Array.isArray(container)) {
    container.forEach(item => {
      if (!isRecord(item) || typeof item.metric !== 'string') return;
      const ranking = toRanking(item.metric, item);
      if (ranking) rankings.push(ranking);
    });
  } else if (isRecord(container)) {
    if (typeof container.metric === 'string') {
      const ranking = toRanking(container.metric, container);
      if (ranking) rankings.push(ranking);
    } else {
      Object.entries(container).forEach(([metric, value]) => {
        const ranking = toRanking(metric, value);
        if (ranking) rankings.push(ranking);
      });
    }
  }
  return rankings;
};

/** GET /admin/suppliers/analytics/performance: one row per supplier; meta.definitions holds column tooltips */
export const getSupplierPerformance = async (
  params: SupplierPerformanceParams = {},
  options: RequestOptions = {}
): Promise<SupplierPerformanceResult> => {
  const response = await adminApi.get(`${BASE}/analytics/performance`, {
    params: buildQueryParams({
      ...rangeParams(params),
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      status: params.status,
      supplierType: params.supplierType,
      search: params.search,
      page: params.page,
      limit: params.limit,
    }),
    signal: options.signal,
  });
  const list = readList<SupplierPerformanceRow>(response.data, params);
  const meta = isRecord(response.data) && isRecord(response.data.meta) ? response.data.meta : {};
  const definitions: Partial<Record<string, string>> = {};
  if (isRecord(meta.definitions)) {
    Object.entries(meta.definitions).forEach(([key, value]) => {
      if (typeof value === 'string') definitions[key] = value;
    });
  }
  return {
    ...list,
    data: list.data.map(row => ({ ...row, metrics: isRecord(row.metrics) ? row.metrics : {} })),
    definitions,
  };
};

/** POST /admin/suppliers/analytics/refresh: 202 Accepted, recalculation runs in the background */
export const refreshSupplierAnalytics = async (): Promise<string | undefined> => {
  const response = await adminApi.post(`${BASE}/analytics/refresh`);
  return readMessage(response.data);
};
