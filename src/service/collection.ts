import adminApi from './adminApi';
import type { AdminCollection } from '../types';
import { normalizeCollectionStatus, type CollectionStatus } from '../constants/collectionStatus';

const mapCollection = (raw: any): AdminCollection => {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id || raw._id,
    // Legacy / lowercase values (e.g. "ARCHIVED", "active") become ACTIVE or INACTIVE
    status: normalizeCollectionStatus(raw.status),
  };
};

/** Guarantees the request body only ever carries "ACTIVE" or "INACTIVE" */
const withValidStatus = <T extends { status?: string }>(data: T): T =>
  data.status === undefined ? data : { ...data, status: normalizeCollectionStatus(data.status) };

/**
 * GET /collections (Admin) — fetch all collections
 */
export const getAdminCollections = async (): Promise<AdminCollection[]> => {
  const response = await adminApi.get('/collections');
  const data = response.data?.data || response.data;
  return Array.isArray(data) ? data.map(mapCollection) : [];
};

/**
 * GET /collections/{id} (Admin) — fetch a single collection
 */
export const getAdminCollection = async (id: string): Promise<AdminCollection> => {
  const response = await adminApi.get(`/collections/${id}`);
  return mapCollection(response.data?.data || response.data);
};

export interface CollectionImage {
  url: string;
  thumbnailUrl?: string;
  alt?: string;
}

export interface CollectionSeo {
  title?: string;
  description?: string;
  keywords?: string[];
}

/** Body for POST /collections and PATCH /collections/{id} */
export interface CollectionPayload {
  name: string;
  slug?: string;
  description?: string;
  image?: CollectionImage;
  seo?: CollectionSeo;
  sortOrder?: number;
  isFeatured?: boolean;
  status: CollectionStatus;
  products?: string[];
}

/**
 * POST /collections (Admin) — create a collection
 */
export const createAdminCollection = async (data: CollectionPayload): Promise<AdminCollection> => {
  const response = await adminApi.post('/collections', withValidStatus(data));
  return mapCollection(response.data?.data || response.data);
};

/**
 * PATCH /collections/{id} (Admin) — update a collection
 */
export const updateAdminCollection = async (
  id: string,
  data: Partial<CollectionPayload>
): Promise<AdminCollection> => {
  const response = await adminApi.patch(`/collections/${id}`, withValidStatus(data));
  return mapCollection(response.data?.data || response.data);
};

/**
 * DELETE /collections/{id} (Admin) — delete a collection
 */
export const deleteAdminCollection = async (id: string): Promise<void> => {
  await adminApi.delete(`/collections/${id}`);
};
