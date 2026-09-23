import adminApi from './adminApi';
import type { AdminCollection } from '../types';

const mapCollection = (raw: any): AdminCollection => {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id || raw._id,
  };
};

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

export interface CollectionPayload {
  name: string;
  status: string;
}

/**
 * POST /collections (Admin) — create a collection
 */
export const createAdminCollection = async (data: CollectionPayload): Promise<AdminCollection> => {
  const response = await adminApi.post('/collections', data);
  return mapCollection(response.data?.data || response.data);
};

/**
 * PATCH /collections/{id} (Admin) — update a collection
 */
export const updateAdminCollection = async (
  id: string,
  data: Partial<CollectionPayload>
): Promise<AdminCollection> => {
  const response = await adminApi.patch(`/collections/${id}`, data);
  return mapCollection(response.data?.data || response.data);
};

/**
 * DELETE /collections/{id} (Admin) — delete a collection
 */
export const deleteAdminCollection = async (id: string): Promise<void> => {
  await adminApi.delete(`/collections/${id}`);
};
