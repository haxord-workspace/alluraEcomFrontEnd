import adminApi from './adminApi';
import { getBackendErrorMessage } from '../utils/apiResponse';

// -----------------------------------------------------------------------------
// CMS FAQs Admin endpoints — field names are best-guess REST conventions (no
// Swagger spec was available to confirm against); adjust the mapping below if
// the real backend uses different names.
//
// GET    /admin/cms/faqs             -> paginated list (search, category, status, page, limit)
// POST   /admin/cms/faqs             -> create
// GET    /admin/cms/faqs/categories  -> distinct categories
// PUT    /admin/cms/faqs/reorder     -> bulk sort order update
// GET    /admin/cms/faqs/{id}        -> single FAQ
// PUT    /admin/cms/faqs/{id}        -> full update
// PATCH  /admin/cms/faqs/{id}        -> partial update (active toggle)
// DELETE /admin/cms/faqs/{id}        -> delete
// -----------------------------------------------------------------------------

export type AdminFaqStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED';

const FAQ_STATUSES: AdminFaqStatus[] = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED'];

export interface AdminFaq {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  status: AdminFaqStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqListParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  /** 'all' omits the filter */
  status?: 'draft' | 'scheduled' | 'published' | 'unpublished' | 'archived' | 'all';
}

export interface FaqList {
  faqs: AdminFaq[];
  total: number;
  page: number;
  limit: number;
}

export interface FaqPayload {
  question: string;
  answer: string;
  category: string;
  sortOrder?: number;
  status?: AdminFaqStatus;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const normalizeStatus = (value: any): AdminFaqStatus | null => {
  const normalized = String(value ?? '').toUpperCase();
  return (FAQ_STATUSES as string[]).includes(normalized) ? (normalized as AdminFaqStatus) : null;
};

const mapFaq = (raw: any): AdminFaq => {
  const legacyActive = raw?.isActive ?? raw?.active;
  return {
    id: raw?._id || raw?.id || '',
    question: raw?.question || '',
    answer: raw?.answer || '',
    category: raw?.category || 'General',
    sortOrder: typeof raw?.sortOrder === 'number' ? raw.sortOrder : Number(raw?.order ?? raw?.displayOrder ?? 0),
    status:
      normalizeStatus(raw?.status) ??
      (typeof legacyActive === 'boolean' ? (legacyActive ? 'PUBLISHED' : 'UNPUBLISHED') : 'DRAFT'),
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
};

const cleanParams = (params: FaqListParams = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== 'all')
  );

export const faqErrorMessage = (error: any, fallback: string): string =>
  getBackendErrorMessage(error, fallback);

/** GET /admin/cms/faqs */
export const getAdminFaqs = async (params: FaqListParams = {}): Promise<FaqList> => {
  const limit = params.limit ?? 10;
  const response = await adminApi.get('/admin/cms/faqs', { params: cleanParams({ ...params, limit }) });
  const data = unwrap(response);
  const list = Array.isArray(data) ? data : data?.faqs || data?.items || data?.docs || [];
  const meta = Array.isArray(data) ? {} : data?.meta || data?.pagination || data || {};
  return {
    faqs: Array.isArray(list) ? list.map(mapFaq) : [],
    total: typeof meta.total === 'number' ? meta.total : list.length,
    page: meta.page ?? params.page ?? 1,
    limit: meta.limit ?? limit,
  };
};

/** GET /admin/cms/faqs/categories */
export const getAdminFaqCategories = async (): Promise<string[]> => {
  const response = await adminApi.get('/admin/cms/faqs/categories');
  const data = unwrap(response);
  const list = Array.isArray(data) ? data : data?.categories || [];
  return list.map((c: any) => (typeof c === 'string' ? c : c?.name || c?.category)).filter(Boolean);
};

/** GET /admin/cms/faqs/{id} */
export const getAdminFaq = async (id: string): Promise<AdminFaq> => {
  const response = await adminApi.get(`/admin/cms/faqs/${id}`);
  return mapFaq(unwrap(response));
};

/** POST /admin/cms/faqs */
export const createAdminFaq = async (payload: FaqPayload): Promise<AdminFaq> => {
  const response = await adminApi.post('/admin/cms/faqs', payload);
  return mapFaq(unwrap(response));
};

/** PUT /admin/cms/faqs/{id} — full update */
export const updateAdminFaq = async (id: string, payload: FaqPayload): Promise<AdminFaq> => {
  const response = await adminApi.put(`/admin/cms/faqs/${id}`, payload);
  return mapFaq(unwrap(response));
};

/** PATCH /admin/cms/faqs/{id} — partial update (e.g. the active toggle) */
export const patchAdminFaq = async (id: string, payload: Partial<FaqPayload>): Promise<AdminFaq> => {
  const response = await adminApi.patch(`/admin/cms/faqs/${id}`, payload);
  return mapFaq(unwrap(response));
};

/** DELETE /admin/cms/faqs/{id} */
export const deleteAdminFaq = async (id: string): Promise<void> => {
  await adminApi.delete(`/admin/cms/faqs/${id}`);
};

/** PUT /admin/cms/faqs/reorder — ordered array of FAQ ids within their category */
export const reorderAdminFaqs = async (faqIds: string[]): Promise<void> => {
  await adminApi.put('/admin/cms/faqs/reorder', { faqIds });
};
