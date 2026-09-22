import adminApi from './adminApi';
import type { Category } from '../types';

const mapCategory = (cat: any): Category => {
  if (!cat) return cat;
  return {
    ...cat,
    id: cat.id || cat._id,
  };
};

export const getCategories = async (search?: string): Promise<Category[]> => {
  const response = await adminApi.get('/categories', {
    params: search ? { search } : undefined,
  });
  const data = response.data.data || response.data;
  return Array.isArray(data) ? data.map(mapCategory) : [];
};

export const getCategory = async (categoryId: string): Promise<Category> => {
  const response = await adminApi.get(`/categories/${categoryId}`);
  const data = response.data.data || response.data;
  return mapCategory(data);
};

export const getCategoryTree = async (): Promise<any> => {
  const response = await adminApi.get('/categories/tree');
  return response.data.data || response.data;
};

export const createCategory = async (data: Omit<Category, 'id'>): Promise<Category> => {
  const response = await adminApi.post('/categories', data);
  const respData = response.data.data || response.data;
  return mapCategory(respData);
};

export const updateCategory = async (categoryId: string, data: Partial<Category>): Promise<Category> => {
  const response = await adminApi.patch(`/categories/${categoryId}`, data);
  const respData = response.data.data || response.data;
  return mapCategory(respData);
};

export const deleteCategory = async (categoryId: string): Promise<void> => {
  await adminApi.delete(`/categories/${categoryId}`);
};
