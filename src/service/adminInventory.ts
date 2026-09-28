import adminApi from './adminApi';

// -----------------------------------------------------------------------------
// Admin inventory endpoints
// GET /admin/inventory, GET /admin/inventory/low-stock,
// GET /admin/inventory/variant/{variantId},
// POST /admin/inventory/variant/{variantId}/stock-in | stock-out | adjust
// -----------------------------------------------------------------------------

export interface InventoryRecord {
  id: string;
  variantId: string;
  productId?: string;
  productName?: string;
  image?: string;
  sku?: string;
  attributes?: { color?: string; size?: string; [key: string]: any };
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lowStockThreshold?: number;
  criticalThreshold?: number;
  /** Backend stock status, e.g. IN_STOCK / LOW_STOCK / OUT_OF_STOCK */
  status?: string;
  /** False for variants that have no inventory record yet (never stocked) */
  isTracked?: boolean;
  updatedAt?: string;
}

export type StockReferenceType = 'MANUAL' | string;

/** Body for stock-in / stock-out; `reference` is required by the backend */
export interface StockMovementPayload {
  quantity: number;
  reason?: string;
  reference?: { type: StockReferenceType; id?: string };
}

/** Body for adjust: a relative correction in the given direction (not an absolute count) */
export interface StockAdjustPayload {
  quantity: number;
  direction: 'IN' | 'OUT';
  reason?: string;
}

const withReference = (payload: StockMovementPayload): StockMovementPayload => ({
  ...payload,
  reference: payload.reference ?? { type: 'MANUAL' },
});

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const num = (...values: any[]): number | undefined => {
  const found = values.find(v => typeof v === 'number' && !Number.isNaN(v));
  return found;
};

// `variantId` / `productId` may be bare ids or populated documents
export const mapInventory = (raw: any): InventoryRecord => {
  const variant = typeof raw?.variantId === 'object' && raw.variantId ? raw.variantId : raw?.variant;
  const productRaw =
    (typeof raw?.productId === 'object' && raw.productId) ||
    raw?.product ||
    (typeof variant?.productId === 'object' && variant.productId) ||
    null;

  // Backend shape: quantity: { onHand, reserved, available }, thresholds: { lowStock, criticalStock }
  const q = typeof raw?.quantity === 'object' && raw.quantity ? raw.quantity : {};
  const onHand = num(q.onHand, raw?.quantityOnHand, raw?.onHand, raw?.quantity, raw?.stock) ?? 0;
  const reserved = num(q.reserved, raw?.quantityReserved, raw?.reserved) ?? 0;
  const available = num(q.available, raw?.quantityAvailable, raw?.available) ?? Math.max(0, onHand - reserved);

  const images: any[] = variant?.images || productRaw?.images || [];
  const image = images.find(img => img?.isPrimary)?.url || images[0]?.url;

  return {
    id: raw?.id || raw?._id,
    variantId: variant ? variant.id || variant._id : raw?.variantId,
    productId: productRaw ? productRaw.id || productRaw._id : raw?.productId || variant?.productId,
    productName: productRaw?.name || raw?.productName,
    image,
    sku: raw?.sku || variant?.sku,
    attributes: variant?.attributes || raw?.attributes,
    quantityOnHand: onHand,
    quantityReserved: reserved,
    quantityAvailable: available,
    lowStockThreshold: num(raw?.thresholds?.lowStock, raw?.lowStockThreshold, raw?.reorderLevel),
    criticalThreshold: num(raw?.thresholds?.criticalStock),
    status: raw?.status,
    isTracked: true,
    updatedAt: raw?.updatedAt,
  };
};

const extractList = (data: any): InventoryRecord[] => {
  const list = Array.isArray(data) ? data : data?.items || data?.inventory || data?.docs || [];
  return Array.isArray(list) ? list.map(mapInventory) : [];
};

/** GET /admin/inventory — list inventory */
export const getInventory = async (params?: Record<string, any>): Promise<InventoryRecord[]> => {
  const response = await adminApi.get('/admin/inventory', { params });
  return extractList(unwrap(response));
};

/** GET /admin/inventory/low-stock — inventory at or below its low-stock threshold */
export const getLowStockInventory = async (params?: Record<string, any>): Promise<InventoryRecord[]> => {
  const response = await adminApi.get('/admin/inventory/low-stock', { params });
  return extractList(unwrap(response));
};

/** GET /admin/inventory/variant/{variantId} — inventory for a single variant */
export const getInventoryByVariant = async (variantId: string): Promise<InventoryRecord> => {
  const response = await adminApi.get(`/admin/inventory/variant/${variantId}`);
  return mapInventory(unwrap(response));
};

/** POST /admin/inventory/variant/{variantId}/stock-in — add stock */
export const stockIn = async (variantId: string, payload: StockMovementPayload): Promise<InventoryRecord> => {
  const response = await adminApi.post(`/admin/inventory/variant/${variantId}/stock-in`, withReference(payload));
  return mapInventory(unwrap(response));
};

/** POST /admin/inventory/variant/{variantId}/stock-out — remove stock */
export const stockOut = async (variantId: string, payload: StockMovementPayload): Promise<InventoryRecord> => {
  const response = await adminApi.post(`/admin/inventory/variant/${variantId}/stock-out`, withReference(payload));
  return mapInventory(unwrap(response));
};

/** POST /admin/inventory/variant/{variantId}/adjust — correct stock by `quantity` in `direction` (IN / OUT) */
export const adjustStock = async (variantId: string, payload: StockAdjustPayload): Promise<InventoryRecord> => {
  const response = await adminApi.post(`/admin/inventory/variant/${variantId}/adjust`, payload);
  return mapInventory(unwrap(response));
};
