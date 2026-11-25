// -----------------------------------------------------------------------------
// Supplier Management (admin only). Backend: /admin/suppliers (branch ajvad_dev).
// The storefront never receives supplier data.
// -----------------------------------------------------------------------------

export const SUPPLIER_STATUSES = ['ACTIVE', 'INACTIVE', 'BLOCKED'] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  BLOCKED: 'Blocked',
};

export const SUPPLIER_TYPES = ['MANUFACTURER', 'WHOLESALER', 'DISTRIBUTOR', 'OTHER'] as const;
export type SupplierType = (typeof SUPPLIER_TYPES)[number];

export const SUPPLIER_TYPE_LABELS: Record<SupplierType, string> = {
  MANUFACTURER: 'Manufacturer',
  WHOLESALER: 'Wholesaler',
  DISTRIBUTOR: 'Distributor',
  OTHER: 'Other',
};

/** Supplier summary embedded on admin products as `product.supplierId` */
export interface ProductSupplierRef {
  _id: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  status: SupplierStatus;
}

/** Full supplier record */
export interface Supplier {
  _id: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
  supplierType?: SupplierType;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxIdentificationNumber?: string;
  paymentTerms?: string;
  notes?: string;
  status: SupplierStatus;
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierListItem extends Supplier {
  productCount: number;
}

/** GET /admin/suppliers/selection item (ACTIVE suppliers only) */
export interface SupplierSelectionItem {
  _id: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  contactPerson?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

// ── Query params ─────────────────────────────────────────────────────────────

export const SUPPLIER_SORTS = [
  'newest',
  'oldest',
  'name_asc',
  'name_desc',
  'products_desc',
  'products_asc',
  'revenue_desc',
  'revenue_asc',
] as const;
export type SupplierSort = (typeof SUPPLIER_SORTS)[number];

export const SUPPLIER_SORT_LABELS: Record<SupplierSort, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  name_asc: 'Name (A-Z)',
  name_desc: 'Name (Z-A)',
  products_desc: 'Most products',
  products_asc: 'Fewest products',
  revenue_desc: 'Top sellers',
  revenue_asc: 'Lowest sellers',
};

export interface SupplierListParams {
  search?: string;
  status?: SupplierStatus;
  supplierType?: SupplierType;
  hasProducts?: boolean;
  minProducts?: number;
  maxProducts?: number;
  /** YYYY-MM-DD */
  createdFrom?: string;
  /** YYYY-MM-DD, inclusive */
  createdTo?: string;
  sortBy?: SupplierSort;
  page?: number;
  /** 1–100, default 20 */
  limit?: number;
}

export interface SupplierSelectionParams {
  search?: string;
  limit?: number;
}

export type SupplierProductSortField = 'createdAt' | 'updatedAt' | 'name' | 'pricing.sellingPrice';
export type SortOrder = 'asc' | 'desc';

export interface SupplierProductsParams {
  search?: string;
  status?: SupplierProductStatus;
  sortBy?: SupplierProductSortField;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
}

// ── Create / update ──────────────────────────────────────────────────────────

/** Editable supplier fields (everything except code, status and system fields) */
export interface SupplierEditableFields {
  name: string;
  companyName?: string;
  contactPerson?: string;
  supplierType?: SupplierType;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  taxIdentificationNumber?: string;
  paymentTerms?: string;
  notes?: string;
}

export type SupplierFieldKey = keyof SupplierEditableFields;

export interface CreateSupplierPayload extends SupplierEditableFields {
  status?: SupplierStatus;
}

/** PATCH /admin/suppliers/:id: only changed fields; never status or supplierCode */
export type UpdateSupplierPayload = Partial<SupplierEditableFields>;

export interface UpdateSupplierStatusPayload {
  status: SupplierStatus;
  reason?: string;
}

export interface SupplierStatusChangeResult {
  supplier: Supplier;
  linkedProducts: number;
  changed: boolean;
  message?: string;
}

// ── Details ──────────────────────────────────────────────────────────────────

export const SUPPLIER_PRODUCT_STATUSES = ['ACTIVE', 'DRAFT', 'INACTIVE', 'ARCHIVED'] as const;
export type SupplierProductStatus = (typeof SUPPLIER_PRODUCT_STATUSES)[number];

export type ProductStatusDistribution = Record<SupplierProductStatus, number>;

export interface SupplierProduct {
  _id: string;
  name: string;
  sku?: string;
  slug?: string;
  status: string;
  pricing?: { mrp?: number; sellingPrice?: number; costPrice?: number; currency?: string };
  /** Primary image (or the first one); null when the product has no images */
  primaryImage?: { url: string; thumbnailUrl: string | null; alt: string | null } | null;
  /** Legacy full list, still returned */
  images?: { url: string; isPrimary?: boolean }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierSalesSummary {
  salesRevenue: number;
  unitsSold: number;
  orderCount: number;
  productsSold: number;
  avgRevenuePerProduct: number;
  firstSaleAt: string | null;
  lastSaleAt: string | null;
}

export interface SupplierInventoryContribution {
  unitsInStock: number;
  unitsAvailable: number;
  inventoryValueAtCost: number;
  unitsInStockWithoutCost: number;
}

export interface SupplierPurchaseSummary {
  available: boolean;
  reason?: string;
}

export const SUPPLIER_ACTIVITY_ACTIONS = [
  'SUPPLIER_CREATED',
  'SUPPLIER_UPDATED',
  'SUPPLIER_STATUS_CHANGED',
  'SUPPLIER_DELETED',
  'SUPPLIER_PRODUCT_ASSIGNED',
  'SUPPLIER_PRODUCT_REMOVED',
  'SUPPLIER_PRODUCT_CHANGED',
] as const;
export type SupplierActivityAction = (typeof SUPPLIER_ACTIVITY_ACTIONS)[number];

export interface SupplierActivityMetadata {
  reason?: string;
  productName?: string;
  productId?: string;
  fromSupplierId?: string;
  toSupplierId?: string;
  fromStatus?: string;
  toStatus?: string;
  [key: string]: unknown;
}

export interface SupplierActivity {
  _id: string;
  action: SupplierActivityAction | string;
  metadata?: SupplierActivityMetadata;
  actorId?: string | null;
  createdAt: string;
}

export interface SupplierDetails {
  profile: Supplier;
  productCount: number;
  productStatusDistribution: ProductStatusDistribution;
  recentProducts: SupplierProduct[];
  salesSummary: SupplierSalesSummary;
  inventoryContribution: SupplierInventoryContribution;
  purchaseSummary: SupplierPurchaseSummary;
  recentActivity: SupplierActivity[];
  analyticsSummary?: SupplierMetrics;
  /** How each number is calculated (tooltips) */
  definitions?: Record<string, string>;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsDateRange {
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  endDate?: string;
}

export interface SupplierSingleAnalytics {
  salesSummary?: SupplierSalesSummary;
  inventoryContribution?: SupplierInventoryContribution;
  [key: string]: unknown;
}

export interface SupplierAnalyticsOverview {
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  blockedSuppliers: number;
  suppliersWithProducts: number;
  suppliersWithoutProducts: number;
  totalProductsAssociated: number;
  productsWithoutSupplier: number;
  distributionByStatus: { status: SupplierStatus; count: number; percentage: number }[];
  purchaseData?: { available: boolean; reason?: string };
}

export const SUPPLIER_READY_METRICS = [
  'sales_revenue',
  'units_sold',
  'products',
  'inventory_units',
  'inventory_value',
  'product_performance',
] as const;
export type SupplierReadyMetric = (typeof SUPPLIER_READY_METRICS)[number];

export const SUPPLIER_UNTRACKED_METRICS = ['purchase_value', 'units_purchased'] as const;
export type SupplierUntrackedMetric = (typeof SUPPLIER_UNTRACKED_METRICS)[number];

export type SupplierMetric = SupplierReadyMetric | SupplierUntrackedMetric;

export interface SupplierRankingRow {
  rank: number;
  supplierId: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  status: SupplierStatus;
  value: number;
}

export interface SupplierRanking {
  metric: SupplierMetric;
  available: boolean;
  definition?: string;
  data: SupplierRankingRow[] | null;
}

export interface SupplierTopParams extends AnalyticsDateRange {
  metric?: SupplierMetric;
  limit?: number;
}

/** Per-supplier numbers (performance rows and details.analyticsSummary). Purchase fields are always null. */
export interface SupplierMetrics {
  totalProducts?: number;
  activeProducts?: number;
  draftProducts?: number;
  /** INACTIVE + ARCHIVED */
  unavailableProducts?: number;
  unitsInStock?: number;
  unitsAvailable?: number;
  inventoryValueAtCost?: number;
  unitsInStockWithoutCost?: number;
  unitsSold?: number;
  salesRevenue?: number;
  orderCount?: number;
  productsSold?: number;
  avgRevenuePerProduct?: number;
  firstSaleAt?: string | null;
  lastSaleAt?: string | null;
  totalUnitsPurchased?: number | null;
  totalPurchaseValue?: number | null;
}

/** Which SupplierMetrics field holds each ready ranking metric */
export const SUPPLIER_METRIC_FIELD: Record<SupplierReadyMetric, keyof SupplierMetrics> = {
  sales_revenue: 'salesRevenue',
  units_sold: 'unitsSold',
  products: 'totalProducts',
  inventory_units: 'unitsInStock',
  inventory_value: 'inventoryValueAtCost',
  product_performance: 'avgRevenuePerProduct',
};

export type SupplierPerformanceMetrics = SupplierMetrics;

export interface SupplierPerformanceRow {
  supplierId: string;
  supplierCode: string;
  name: string;
  companyName?: string;
  status: SupplierStatus;
  supplierType?: SupplierType;
  metrics: SupplierPerformanceMetrics;
}

export interface SupplierPerformanceParams extends AnalyticsDateRange {
  sortBy?: SupplierReadyMetric;
  sortOrder?: SortOrder;
  status?: SupplierStatus;
  supplierType?: SupplierType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SupplierPerformanceResult extends Paginated<SupplierPerformanceRow> {
  definitions: Partial<Record<string, string>>;
}

// ── Errors ───────────────────────────────────────────────────────────────────

export type SupplierErrorCode =
  | 'VALIDATION_ERROR'
  | 'SUPPLIER_NOT_ASSIGNABLE'
  | 'INVALID_SUPPLIER'
  | 'PURCHASE_DATA_UNAVAILABLE'
  | 'FORBIDDEN'
  | 'SUPPLIER_NOT_FOUND'
  | 'SUPPLIER_HAS_PRODUCTS';

export interface SupplierApiError {
  status?: number;
  code?: SupplierErrorCode | string;
  message: string;
  fieldErrors: Record<string, string>;
  /** From 409 SUPPLIER_HAS_PRODUCTS: error.details[0].linkedProducts */
  linkedProducts?: number;
}
