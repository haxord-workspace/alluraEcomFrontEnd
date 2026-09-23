import adminApi from './adminApi';
import type { AdminProductVariant } from '../types';

const mapVariant = (raw: any): AdminProductVariant => {
  if (!raw) return raw;
  return {
    ...raw,
    id: raw.id || raw._id,
  };
};

/**
 * GET /admin/product-variants — fetch all variants
 */
export const getAdminVariants = async (): Promise<AdminProductVariant[]> => {
  const response = await adminApi.get('/admin/product-variants');
  const data = response.data?.data || response.data;
  return Array.isArray(data) ? data.map(mapVariant) : [];
};

/**
 * GET /admin/product-variants/product/{productId} — fetch variants for one product
 */
export const getAdminVariantsByProduct = async (productId: string): Promise<AdminProductVariant[]> => {
  const response = await adminApi.get(`/admin/product-variants/product/${productId}`);
  const data = response.data?.data || response.data;
  return Array.isArray(data) ? data.map(mapVariant) : [];
};

/**
 * GET /admin/product-variants/{variantId} — fetch a single variant
 */
export const getAdminVariant = async (variantId: string): Promise<AdminProductVariant> => {
  const response = await adminApi.get(`/admin/product-variants/${variantId}`);
  return mapVariant(response.data?.data || response.data);
};

export interface VariantPayload {
  productId: string;
  sku: string;
  barcode?: { value: string; type: string };
  attributes: { color?: string; size?: string };
  pricing: { mrp: number; sellingPrice: number; currency: string };
  status?: string;
}

/**
 * POST /admin/product-variants — create a new variant
 */
export const createAdminVariant = async (data: VariantPayload): Promise<AdminProductVariant> => {
  const response = await adminApi.post('/admin/product-variants', data);
  return mapVariant(response.data?.data || response.data);
};

/**
 * PATCH /admin/product-variants/{variantId} — update a variant
 */
export const updateAdminVariant = async (
  variantId: string,
  data: Partial<VariantPayload>
): Promise<AdminProductVariant> => {
  const response = await adminApi.patch(`/admin/product-variants/${variantId}`, data);
  return mapVariant(response.data?.data || response.data);
};

/**
 * DELETE /admin/product-variants/{variantId} — delete a variant
 */
export const deleteAdminVariant = async (variantId: string): Promise<void> => {
  await adminApi.delete(`/admin/product-variants/${variantId}`);
};

/**
 * PATCH /admin/product-variants/{variantId}/activate
 */
export const activateAdminVariant = async (variantId: string): Promise<AdminProductVariant> => {
  const response = await adminApi.patch(`/admin/product-variants/${variantId}/activate`);
  return mapVariant(response.data?.data || response.data);
};

/**
 * PATCH /admin/product-variants/{variantId}/deactivate
 */
export const deactivateAdminVariant = async (variantId: string): Promise<AdminProductVariant> => {
  const response = await adminApi.patch(`/admin/product-variants/${variantId}/deactivate`);
  return mapVariant(response.data?.data || response.data);
};

/**
 * PATCH /admin/product-variants/{variantId}/barcode — assign a barcode
 */
export const assignVariantBarcode = async (
  variantId: string,
  barcode: { value: string; type: string }
): Promise<AdminProductVariant> => {
  const response = await adminApi.patch(`/admin/product-variants/${variantId}/barcode`, barcode);
  return mapVariant(response.data?.data || response.data);
};

/**
 * DELETE /admin/product-variants/{variantId}/barcode — remove the barcode
 */
export const removeVariantBarcode = async (variantId: string): Promise<void> => {
  await adminApi.delete(`/admin/product-variants/${variantId}/barcode`);
};

/**
 * GET /admin/product-variants/{variantId}/barcode/print — fetch the printable
 * barcode image as a blob URL (auth is header-based, so an <img src> alone can't load it).
 */
export const getVariantBarcodePrintImage = async (variantId: string): Promise<string> => {
  const response = await adminApi.get(`/admin/product-variants/${variantId}/barcode/print`, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
};
