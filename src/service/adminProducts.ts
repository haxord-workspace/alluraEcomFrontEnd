import adminApi from './adminApi';
import type { AdminProduct } from '../types';

const mapProduct = (p: any): AdminProduct => {
  if (!p) return p;
  return {
    ...p,
    id: p.id || p._id,
  };
};

/**
 * GET /admin/products — fetch all products
 */
export const getAdminProducts = async (): Promise<AdminProduct[]> => {
  const response = await adminApi.get('/admin/products');
  const data = response.data?.data || response.data;
  return Array.isArray(data) ? data.map(mapProduct) : [];
};

/**
 * GET /admin/products/{id} — fetch single product
 */
export const getAdminProduct = async (id: string): Promise<AdminProduct> => {
  const response = await adminApi.get(`/admin/products/${id}`);
  const data = response.data?.data || response.data;
  return mapProduct(data);
};

/**
 * POST /admin/products — create new product
 */
export const createAdminProduct = async (
  data: Omit<AdminProduct, 'id' | 'createdAt' | 'updatedAt'>
): Promise<AdminProduct> => {
  const response = await adminApi.post('/admin/products', data);
  const respData = response.data?.data || response.data;
  return mapProduct(respData);
};

/**
 * PATCH /admin/products/{id} — update product
 */
export const updateAdminProduct = async (
  id: string,
  data: Partial<AdminProduct>
): Promise<AdminProduct> => {
  const response = await adminApi.patch(`/admin/products/${id}`, data);
  const respData = response.data?.data || response.data;
  return mapProduct(respData);
};

/**
 * PATCH /admin/products/{id}/status — change product status only
 */
export const updateAdminProductStatus = async (
  id: string,
  status: AdminProduct['status']
): Promise<AdminProduct> => {
  const response = await adminApi.patch(`/admin/products/${id}/status`, { status });
  const respData = response.data?.data || response.data;
  return mapProduct(respData);
};
