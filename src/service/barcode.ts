import adminApi from './adminApi';
import type { AdminProductVariant } from '../types';

// Some endpoints (e.g. a scan/lookup hit) may return a populated sub-document — an object
// like `{ _id, name }` — where the list endpoint returns a plain id/name string. Coerce
// either shape down to a single renderable string so nothing ever reaches JSX as an object.
const toSafeString = (val: unknown): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (val && typeof val === 'object' && typeof (val as any).name === 'string') return (val as any).name;
  return '';
};

const toSafeId = (val: unknown): string => {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as any;
    if (typeof obj._id === 'string') return obj._id;
    if (typeof obj.id === 'string') return obj.id;
  }
  return '';
};

/**
 * Normalizes a raw variant payload into the shape the UI safely renders, regardless of
 * which of the (possibly inconsistent) backend endpoints it came from. Centralizing this
 * here means components can render every field directly without their own shape-guessing.
 */
const mapVariant = (raw: any): AdminProductVariant | null => {
  if (!raw) return null;

  const attrs = raw.attributes && typeof raw.attributes === 'object' ? raw.attributes : {};
  const rawBarcode = raw.barcode;
  const barcode = rawBarcode && typeof rawBarcode === 'object'
    ? { value: toSafeString(rawBarcode.value), type: toSafeString(rawBarcode.type) }
    : rawBarcode
      ? { value: toSafeString(rawBarcode), type: '' }
      : null;
  const pricing = raw.pricing && typeof raw.pricing === 'object' ? raw.pricing : {};

  return {
    ...raw,
    id: toSafeId(raw.id) || toSafeId(raw._id),
    productId: toSafeId(raw.productId) || toSafeString(raw.productId),
    sku: toSafeString(raw.sku),
    barcode,
    attributes: {
      ...attrs,
      color: toSafeString(attrs.color),
      size: toSafeString(attrs.size),
    },
    pricing: {
      ...pricing,
      mrp: Number(pricing.mrp) || 0,
      sellingPrice: Number(pricing.sellingPrice) || 0,
      currency: toSafeString(pricing.currency),
    },
    images: Array.isArray(raw.images) ? raw.images : [],
  };
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
