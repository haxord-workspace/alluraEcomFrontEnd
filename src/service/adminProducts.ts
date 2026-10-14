import adminApi from './adminApi';
import type { AdminProduct } from '../types';

export type AdminProductWithMessage = AdminProduct & { _message?: string };

const mapProduct = (p: any, message?: string): AdminProductWithMessage => {
  if (!p) return p;
  return {
    ...p,
    id: p.id || p._id,
    ...(message ? { _message: message } : {}),
  };
};

/**
 * GET /admin/products — fetch all products
 */
export const getAdminProducts = async (): Promise<AdminProduct[]> => {
  const response = await adminApi.get('/admin/products');
  const data = response.data?.data || response.data;
  return Array.isArray(data) ? data.map(p => mapProduct(p, response.data?.message)) : [];
};

/**
 * GET /admin/products/{id} — fetch single product
 */
export const getAdminProduct = async (id: string): Promise<AdminProductWithMessage> => {
  const response = await adminApi.get(`/admin/products/${id}`);
  const data = response.data?.data || response.data;
  return mapProduct(data, response.data?.message);
};

/**
 * POST /admin/products — create new product
 */
export const createAdminProduct = async (
  data: Omit<AdminProduct, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AdminProductWithMessage> => {
  const response = await adminApi.post('/admin/products', data);
  const respData = response.data?.data || response.data;
  return mapProduct(respData, response.data?.message);
};

/**
 * PATCH /admin/products/{id} — update product
 */
export const updateAdminProduct = async (
  id: string,
  data: Partial<AdminProduct>
): Promise<AdminProductWithMessage> => {
  const response = await adminApi.patch(`/admin/products/${id}`, data);
  const respData = response.data?.data || response.data;
  return mapProduct(respData, response.data?.message);
};

/**
 * PATCH /admin/products/{id}/status — change product status only
 */
export const updateAdminProductStatus = async (
  id: string,
  status: AdminProduct['status']
): Promise<AdminProductWithMessage> => {
  const response = await adminApi.patch(`/admin/products/${id}/status`, { status });
  const respData = response.data?.data || response.data;
  return mapProduct(respData, response.data?.message);
};

/**
 * DELETE /admin/products/{id} — delete product permanently
 */
export const deleteAdminProduct = async (id: string): Promise<string | undefined> => {
  try {
    const response = await adminApi.delete(`/admin/products/${id}`);
    return response.data?.message;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 404 || status === 405) {
      // Fallback to ARCHIVED if backend doesn't support DELETE HTTP method
      const fallback = await updateAdminProductStatus(id, 'ARCHIVED');
      return fallback?._message || 'Product archived';
    }
    throw err;
  }
};
