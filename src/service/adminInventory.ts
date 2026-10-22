import adminApi from './adminApi';

// -----------------------------------------------------------------------------
// Admin Inventory Module (API /api/v1/admin/inventory)
// Matches Backend Integration Guide
// -----------------------------------------------------------------------------

export const InventoryStatus = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
  CRITICAL_STOCK: 'CRITICAL_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
} as const;
export type InventoryStatus = (typeof InventoryStatus)[keyof typeof InventoryStatus];

export const TransactionType = {
  STOCK_IN: 'STOCK_IN',
  STOCK_OUT: 'STOCK_OUT',
  ADJUSTMENT_IN: 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT: 'ADJUSTMENT_OUT',
  RESERVATION: 'RESERVATION',
  RELEASE_RESERVATION: 'RELEASE_RESERVATION',
  ORDER_DEDUCTION: 'ORDER_DEDUCTION',
  ORDER_CANCELLATION: 'ORDER_CANCELLATION',
  RETURN_IN: 'RETURN_IN',
  DAMAGE_OUT: 'DAMAGE_OUT',
  TRANSFER_OUT: 'TRANSFER_OUT',
  TRANSFER_IN: 'TRANSFER_IN',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const ReferenceType = {
  MANUAL: 'MANUAL',
  CART: 'CART',
  ORDER: 'ORDER',
} as const;
export type ReferenceType = (typeof ReferenceType)[keyof typeof ReferenceType];

export interface InventoryQuantity {
  onHand: number;      // Total physical units on hand
  reserved: number;    // Units reserved for active carts/checkout
  available: number;   // onHand - reserved (units available to sell)
}

export interface InventoryThresholds {
  lowStock: number;       // Default: 10
  criticalStock: number;  // Default: 5
}

export interface InventoryItem {
  _id: string;
  productId: {
    _id: string;
    name: string;
  } | string;
  variantId: string | any;
  sku: string;
  barcode?: string;
  quantity: InventoryQuantity;
  thresholds: InventoryThresholds;
  status: InventoryStatus | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InventoryListResponse {
  success: boolean;
  message: string;
  data: InventoryItem[];
  meta?: {
    pagination: PaginationMeta;
  };
}

export interface InventoryRecord {
  id: string;
  variantId: string;
  productId?: string;
  productName?: string;
  image?: string;
  sku?: string;
  barcode?: string;
  attributes?: { color?: string; size?: string; [key: string]: any };
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  lowStockThreshold?: number;
  criticalThreshold?: number;
  /** Backend stock status: IN_STOCK / LOW_STOCK / CRITICAL_STOCK / OUT_OF_STOCK */
  status?: InventoryStatus | string;
  /** False for variants that have no inventory record yet (never stocked) */
  isTracked?: boolean;
  createdAt?: string;
  updatedAt?: string;
  raw?: any;
}

export type StockReferenceType = 'MANUAL' | string;

export interface StockMovementPayload {
  quantity: number;
  reason?: string;
  reference?: { type: StockReferenceType; id?: string };
}

export interface StockAdjustPayload {
  quantity: number;
  direction: 'IN' | 'OUT';
  reason?: string;
}

export interface InventoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  productId?: string;
  variantId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryTransactionItem {
  _id: string;
  id?: string;
  inventoryId?: string;
  variantId: string;
  productId?: string;
  type: TransactionType | string;
  quantity: number;
  previousBalance?: { onHand: number; reserved: number; available: number };
  newBalance?: { onHand: number; reserved: number; available: number };
  reason?: string;
  reference?: { type: string; id?: string };
  performedBy?: { _id: string; name?: string; email?: string } | string;
  createdAt: string;
  updatedAt?: string;
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

// Map backend InventoryItem into unified InventoryRecord
export const mapInventory = (raw: any): InventoryRecord => {
  const variant = typeof raw?.variantId === 'object' && raw.variantId ? raw.variantId : raw?.variant;
  const productRaw =
    (typeof raw?.productId === 'object' && raw.productId) ||
    raw?.product ||
    (typeof variant?.productId === 'object' && variant.productId) ||
    null;

  const q = typeof raw?.quantity === 'object' && raw.quantity ? raw.quantity : {};
  const onHand = num(q.onHand, raw?.quantityOnHand, raw?.onHand, raw?.quantity, raw?.stock) ?? 0;
  const reserved = num(q.reserved, raw?.quantityReserved, raw?.reserved) ?? 0;
  const available = num(q.available, raw?.quantityAvailable, raw?.available) ?? Math.max(0, onHand - reserved);

  const images: any[] = variant?.images || productRaw?.images || [];
  const image = images.find(img => img?.isPrimary)?.url || images[0]?.url;

  const prodId = productRaw ? (productRaw._id || productRaw.id) : (typeof raw?.productId === 'string' ? raw.productId : undefined);
  const prodName = productRaw?.name || (typeof raw?.productId === 'object' ? raw?.productId?.name : undefined) || raw?.productName;
  const varId = variant ? (variant._id || variant.id) : (typeof raw?.variantId === 'string' ? raw.variantId : raw?.variantId?._id);

  return {
    id: raw?._id || raw?.id || '',
    variantId: varId || '',
    productId: prodId,
    productName: prodName,
    image,
    sku: raw?.sku || variant?.sku,
    barcode: raw?.barcode || variant?.barcode?.value,
    attributes: variant?.attributes || raw?.attributes,
    quantityOnHand: onHand,
    quantityReserved: reserved,
    quantityAvailable: available,
    lowStockThreshold: num(raw?.thresholds?.lowStock, raw?.lowStockThreshold, 10),
    criticalThreshold: num(raw?.thresholds?.criticalStock, 5),
    status: raw?.status || (available <= 0 ? InventoryStatus.OUT_OF_STOCK : onHand <= 10 ? InventoryStatus.LOW_STOCK : InventoryStatus.IN_STOCK),
    isTracked: true,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
    raw,
  };
};

const extractList = (data: any): InventoryRecord[] => {
  const list = Array.isArray(data) ? data : data?.items || data?.inventory || data?.inventories || data?.docs || [];
  return Array.isArray(list) ? list.map(mapInventory) : [];
};

/** GET /admin/inventory — list inventory with query filters & pagination */
export const getInventory = async (params?: InventoryQueryParams): Promise<InventoryRecord[]> => {
  const response = await adminApi.get('/admin/inventory', { params });
  return extractList(unwrap(response));
};

/** GET /admin/inventory with full pagination meta response */
export const getInventoryWithMeta = async (params?: InventoryQueryParams): Promise<{ items: InventoryRecord[]; meta?: { pagination: PaginationMeta } }> => {
  const response = await adminApi.get('/admin/inventory', { params });
  const rawData = response.data;
  const items = extractList(rawData?.data ?? rawData);
  return {
    items,
    meta: rawData?.meta,
  };
};

/** GET /admin/inventory/low-stock — inventory at or below low/critical threshold */
export const getLowStockInventory = async (params?: InventoryQueryParams): Promise<InventoryRecord[]> => {
  const response = await adminApi.get('/admin/inventory/low-stock', { params });
  return extractList(unwrap(response));
};

/** GET /admin/inventory/out-of-stock — inventory where available <= 0 */
export const getOutOfStockInventory = async (params?: InventoryQueryParams): Promise<InventoryRecord[]> => {
  const response = await adminApi.get('/admin/inventory/out-of-stock', { params });
  return extractList(unwrap(response));
};

/** GET /admin/inventory/variant/{variantId} — inventory for a single variant */
export const getInventoryByVariant = async (variantId: string): Promise<InventoryRecord> => {
  const response = await adminApi.get(`/admin/inventory/variant/${variantId}`);
  return mapInventory(unwrap(response));
};

/** GET /admin/inventory/sku/{sku} — inventory by SKU */
export const getInventoryBySku = async (sku: string): Promise<InventoryRecord> => {
  const response = await adminApi.get(`/admin/inventory/sku/${encodeURIComponent(sku)}`);
  return mapInventory(unwrap(response));
};

/** GET /admin/inventory/barcode/{barcode} — inventory by barcode */
export const getInventoryByBarcode = async (barcode: string): Promise<InventoryRecord> => {
  const response = await adminApi.get(`/admin/inventory/barcode/${encodeURIComponent(barcode)}`);
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

/** GET /admin/inventory/transactions — audit trail of stock transactions */
export const getInventoryTransactions = async (params?: {
  page?: number;
  limit?: number;
  type?: string;
  variantId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ transactions: InventoryTransactionItem[]; meta?: { pagination: PaginationMeta } }> => {
  const endpoint = params?.variantId
    ? `/admin/inventory/variant/${params.variantId}/transactions`
    : '/admin/inventory/transactions';
  const response = await adminApi.get(endpoint, { params });
  const raw = response.data;
  const list = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : raw?.items || [];
  return {
    transactions: list.map((tx: any) => ({
      ...tx,
      id: tx.id || tx._id,
    })),
    meta: raw?.meta,
  };
};

/** Consolidated inventoryApi object as specified in the integration guide */
export const inventoryApi = {
  list: getInventory,
  listWithMeta: getInventoryWithMeta,
  getLowStock: getLowStockInventory,
  getOutOfStock: getOutOfStockInventory,
  getByVariantId: getInventoryByVariant,
  getBySku: getInventoryBySku,
  getByBarcode: getInventoryByBarcode,
  stockIn,
  stockOut,
  adjustStock,
  getTransactions: getInventoryTransactions,
};

export default inventoryApi;
