import adminApi from './adminApi';
import type { Category } from '../types';
import { normalizeActiveStatus } from '../constants/status';

export type CategoryWithMessage = Category & { _message?: string };

const mapCategory = (cat: any, message?: string): CategoryWithMessage => {
  if (!cat) return cat;
  return {
    ...cat,
    id: cat.id || cat._id,
    // Legacy / lowercase values (e.g. "ARCHIVED", "active") become ACTIVE or INACTIVE
    status: normalizeActiveStatus(cat.status),
    ...(message ? { _message: message } : {}),
  };
};

/** Guarantees the request body only ever carries "ACTIVE" or "INACTIVE" */
const withValidStatus = <T extends { status?: string }>(data: T): T =>
  data.status === undefined ? data : { ...data, status: normalizeActiveStatus(data.status) };

export const getCategories = async (search?: string): Promise<Category[]> => {
  const response = await adminApi.get('/categories', {
    params: search ? { search } : undefined,
  });
  const data = response.data.data || response.data;
  return Array.isArray(data) ? data.map(c => mapCategory(c, response.data?.message)) : [];
};

export const getCategory = async (categoryId: string): Promise<CategoryWithMessage> => {
  const response = await adminApi.get(`/categories/${categoryId}`);
  const data = response.data.data || response.data;
  return mapCategory(data, response.data?.message);
};

export const getCategoryTree = async (): Promise<any> => {
  const response = await adminApi.get('/categories/tree');
  return response.data.data || response.data;
};

export const createCategory = async (data: Omit<Category, 'id'>): Promise<CategoryWithMessage> => {
  const response = await adminApi.post('/categories', withValidStatus(data));
  const respData = response.data.data || response.data;
  return mapCategory(respData, response.data?.message);
};

export const updateCategory = async (categoryId: string, data: Partial<Category>): Promise<CategoryWithMessage> => {
  const response = await adminApi.patch(`/categories/${categoryId}`, withValidStatus(data));
  const respData = response.data.data || response.data;
  return mapCategory(respData, response.data?.message);
};

export const deleteCategory = async (categoryId: string): Promise<string | undefined> => {
  const response = await adminApi.delete(`/categories/${categoryId}`);
  return response.data?.message;
};
