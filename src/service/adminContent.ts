import adminApi from './adminApi';
import { getBackendErrorMessage } from '../utils/apiResponse';
import type {
  ContentListItem,
  ContentDetail,
  ContentListParams,
  ContentListResponse,
  CreateContentPayload,
  UpdateContentPayload,
  UpdateContentStatusPayload,
} from '../types/content';

// -----------------------------------------------------------------------------
// Admin CMS — Pages & Policies
// GET    /admin/content              List content pages (titles only, no content body)
// POST   /admin/content               Create a content page
// GET    /admin/content/{id}          Get a content page by id (includes content body)
// PATCH  /admin/content/{id}          Save a content page (title/content/slug) — optimistic locking via `updatedAt`
// DELETE /admin/content/{id}          Soft-delete a content page
// PATCH  /admin/content/{id}/status   Publish or unpublish a content page
// -----------------------------------------------------------------------------

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const cleanParams = (params?: Record<string, any>) =>
  Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== ''));

export const contentErrorMessage = (error: any, fallback: string): string =>
  getBackendErrorMessage(error, fallback);

/** True when the error is the PATCH /admin/content/{id} optimistic-locking conflict. */
export const isContentConflict = (error: any): boolean => error?.response?.status === 409;

const mapContentListItem = (raw: any): ContentListItem => ({
  id: raw?.id || raw?._id || '',
  title: raw?.title || '',
  slug: raw?.slug || '',
  status: String(raw?.status || 'DRAFT').toUpperCase(),
  type: String(raw?.type || 'PAGE').toUpperCase(),
  createdAt: raw?.createdAt || '',
  updatedAt: raw?.updatedAt || '',
});

const mapContentDetail = (raw: any): ContentDetail => ({
  ...mapContentListItem(raw),
  content: raw?.content ?? '',
});

const mapList = (response: any, fallbackLimit: number, fallbackPage: number): ContentListResponse => {
  const data = unwrap(response) || {};
  const list = Array.isArray(data) ? data : data?.items || [];
  const items = Array.isArray(list) ? list.map(mapContentListItem) : [];
  const total = typeof data.total === 'number' ? data.total : items.length;
  const limit = data.limit ?? fallbackLimit;
  return {
    items,
    total,
    page: data.page ?? fallbackPage,
    limit,
    totalPages: data.totalPages ?? Math.max(1, Math.ceil(total / limit)),
  };
};

/** GET /admin/content */
export const getAdminContents = async (params: ContentListParams = {}): Promise<ContentListResponse> => {
  const limit = params.limit ?? 20;
  const page = params.page ?? 1;
  const response = await adminApi.get('/admin/content', { params: cleanParams({ ...params, limit, page }) });
  return mapList(response, limit, page);
};

/** POST /admin/content */
export const createAdminContent = async (payload: CreateContentPayload): Promise<ContentDetail> => {
  const response = await adminApi.post('/admin/content', payload);
  return mapContentDetail(unwrap(response));
};

/** GET /admin/content/{id} */
export const getAdminContentById = async (id: string): Promise<ContentDetail> => {
  const response = await adminApi.get(`/admin/content/${id}`);
  return mapContentDetail(unwrap(response));
};

/** PATCH /admin/content/{id} — `payload.updatedAt` must be the value last read for this page. */
export const updateAdminContent = async (id: string, payload: UpdateContentPayload): Promise<ContentDetail> => {
  const response = await adminApi.patch(`/admin/content/${id}`, payload);
  return mapContentDetail(unwrap(response));
};

/** DELETE /admin/content/{id} — soft delete */
export const deleteAdminContent = async (id: string): Promise<void> => {
  await adminApi.delete(`/admin/content/${id}`);
};

/** PATCH /admin/content/{id}/status */
export const updateAdminContentStatus = async (
  id: string,
  payload: UpdateContentStatusPayload
): Promise<ContentDetail> => {
  const response = await adminApi.patch(`/admin/content/${id}/status`, payload);
  return mapContentDetail(unwrap(response));
};
