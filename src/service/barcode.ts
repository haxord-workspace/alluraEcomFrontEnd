import adminApi from './adminApi';
import type { AdminProductVariant } from '../types';

const mapVariant = (raw: any): AdminProductVariant | null => {
  if (!raw) return null;
  return { ...raw, id: raw.id || raw._id };
};

export interface GeneratedBarcode {
  value: string;
  type: string;
  [key: string]: any;
}

/**
 * POST /barcodes/generate — generate a unique barcode value of the given type.
 */
export const generateBarcode = async (type: string = 'EAN13'): Promise<GeneratedBarcode> => {
  const response = await adminApi.post('/barcodes/generate', { type });
  return response.data?.data || response.data;
};

export interface BarcodeValidationResult {
  valid: boolean;
  [key: string]: any;
}

/**
 * POST /barcodes/validate — validate a barcode value/type pair.
 */
export const validateBarcode = async (value: string, type: string): Promise<BarcodeValidationResult> => {
  const response = await adminApi.post('/barcodes/validate', { value, type });
  return response.data?.data || response.data;
};

/**
 * POST /barcodes/scan — resolve a scanned barcode value to its product variant.
 * Returns null (instead of throwing) when the backend responds 404 Not Found.
 */
export const scanBarcode = async (value: string): Promise<AdminProductVariant | null> => {
  try {
    const response = await adminApi.post('/barcodes/scan', { value });
    return mapVariant(response.data?.data || response.data);
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

/**
 * GET /barcodes/{value} — look up a product variant by barcode value.
 * Returns null (instead of throwing) when the backend responds 404 Not Found.
 */
export const lookupBarcode = async (value: string): Promise<AdminProductVariant | null> => {
  try {
    const response = await adminApi.get(`/barcodes/${encodeURIComponent(value)}`);
    return mapVariant(response.data?.data || response.data);
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};
