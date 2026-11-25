import api from './api';
import { colorHex } from '../data/colorPalette';
import { toNumber } from '../utils/number';
import type { Product, ProductColor, ProductVariant, Category } from '../types';

// -----------------------------------------------------------------------------
// Storefront (public, unauthenticated) product & category endpoints
// GET /store/products, GET /store/products/:id, GET /store/products/slug/:slug,
// GET /store/categories
// -----------------------------------------------------------------------------

const FALLBACK_IMAGE = '/images/best-sellers/classic-cream-anarkali.jpeg';
const DEFAULT_HEX = '#D9C9B4';

/** Placeholder for cart lines / products that have no colour option */
export const NO_COLOR: ProductColor = { name: '', hex: '' };

const mapStatus = (status?: string): Product['status'] => {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'DRAFT') return 'Draft';
  if (status === 'ARCHIVED') return 'Archived';
  return undefined;
};

// Variants are only present on the detail/slug endpoints; they're needed to add the right SKU to the cart
const mapStoreVariant = (raw: any): ProductVariant => {
  const colorAttr = raw.attributes?.color;
  return {
    id: raw.id || raw._id,
    sku: raw.sku || '',
    barcode: raw.barcode?.value || '',
    color: typeof colorAttr === 'object' && colorAttr ? colorAttr : colorAttr ? { name: String(colorAttr), hex: colorHex(String(colorAttr)) || DEFAULT_HEX } : NO_COLOR,
    size: raw.attributes?.size || '',
    price: toNumber(raw.pricing?.sellingPrice) ?? 0,
    mrp: toNumber(raw.pricing?.mrp) ?? 0,
    // The public endpoints don't include inventory: leave it unknown instead of reporting 0 (sold out).
    // The cart API is the source of truth and rejects a variant that is really out of stock.
    stockOnHand: toNumber(raw.stockOnHand ?? raw.inventory?.quantityOnHand),
    stockReserved: toNumber(raw.stockReserved ?? raw.inventory?.quantityReserved),
    stockAvailable: toNumber(raw.stockAvailable ?? raw.inventory?.quantityAvailable),
    images: Array.isArray(raw.images) ? raw.images : [],
  };
};

/**
 * Maps a raw backend product (list or detail shape) to the frontend Product type.
 * `categoryMap` resolves a bare categoryId string to a name when the list endpoint
 * doesn't populate it (the detail/slug endpoints already return categoryId as an object).
 */
export const mapStoreProduct = (raw: any, categoryMap?: Record<string, string>): Product => {
  const images = Array.isArray(raw.images) ? raw.images : [];
  const primary = images.find((img: any) => img?.isPrimary)?.url || images[0]?.url || FALLBACK_IMAGE;
  const secondary = images.find((img: any) => img?.url && img.url !== primary)?.url || '';

  const categoryIdRaw = typeof raw.categoryId === 'object' && raw.categoryId ? raw.categoryId._id : raw.categoryId;
  const categoryName =
    (typeof raw.categoryId === 'object' && raw.categoryId?.name) ||
    (categoryIdRaw && categoryMap?.[categoryIdRaw]) ||
    '';

  const variants: ProductVariant[] | undefined = Array.isArray(raw.variants) ? raw.variants.map(mapStoreVariant) : undefined;

  // Only show options the backend actually provides (directly, or derived from variants)
  const colors: ProductColor[] =
    Array.isArray(raw.colors) && raw.colors.length > 0
      ? raw.colors
      : (variants || [])
          .map(v => v.color)
          .filter((c, i, all) => c.name && all.findIndex(o => o.name.toLowerCase() === c.name.toLowerCase()) === i);
  const sizes: string[] =
    Array.isArray(raw.sizes) && raw.sizes.length > 0
      ? raw.sizes
      : (variants || []).map(v => v.size).filter((s, i, all) => s && all.indexOf(s) === i);

  return {
    id: raw.id || raw._id,
    slug: raw.slug || raw.id || raw._id,
    name: raw.name,
    price: toNumber(raw.pricing?.sellingPrice) ?? 0,
    originalPrice: toNumber(raw.pricing?.mrp),
    category: categoryName,
    categoryId: categoryIdRaw,
    occasion: raw.occasion || '',
    rating: raw.averageRating ?? 0,
    reviewsCount: raw.reviewCount ?? 0,
    isBestSeller: !!raw.isBestSeller,
    isNewArrival: !!raw.isNewArrival,
    isFeatured: !!raw.isFeatured,
    colors,
    sizes,
    inStock: raw.status ? raw.status === 'ACTIVE' : true,
    images: {
      primary,
      secondary,
      gallery: images.map((img: any) => img?.url).filter(Boolean),
    },
    description: raw.description || '',
    shortDescription: raw.shortDescription || '',
    fabricDetails: raw.fabricDetails || '',
    careInstructions: raw.careInstructions || '',
    stylingTips: raw.stylingTips || '',
    sku: raw.sku || '',
    status: mapStatus(raw.status),
    variants,
    hasVariants: !!raw.hasVariants,
  };
};

export const mapStoreCategory = (raw: any): Category => ({
  id: raw.id || raw._id,
  name: raw.name,
  slug: raw.slug,
  status: raw.status,
  image: raw.image,
  order: raw.sortOrder,
});

export interface StoreProductsParams {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
  sort?: string;
  minPrice?: number;
  maxPrice?: number;
  [key: string]: any;
}

export interface StoreProductsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StoreProductsResult {
  products: Product[];
  meta: StoreProductsMeta;
}

/**
 * GET /store/products — public product listing (search, categoryId & pagination supported).
 */
export const getStoreProducts = async (
  params?: StoreProductsParams,
  categoryMap?: Record<string, string>
): Promise<StoreProductsResult> => {
  const response = await api.get('/store/products', { params });
  const rawData = response.data?.data;
  const data = Array.isArray(rawData) ? rawData : (rawData?.products || response.data?.products || []);
  const rawMeta = response.data?.meta || response.data?.pagination || rawData?.pagination;
  const meta: StoreProductsMeta = {
    total: rawMeta?.total ?? data.length,
    page: rawMeta?.page ?? (params?.page || 1),
    limit: rawMeta?.limit ?? (params?.limit || data.length),
    totalPages: rawMeta?.totalPages ?? Math.max(1, Math.ceil((rawMeta?.total ?? data.length) / (params?.limit || 8))),
  };
  return {
    products: Array.isArray(data) ? data.map((p: any) => mapStoreProduct(p, categoryMap)) : [],
    meta,
  };
};

/**
 * GET /store/products/:id — single product by its Mongo ID.
 */
export const getStoreProduct = async (id: string): Promise<Product> => {
  const response = await api.get(`/store/products/${id}`);
  return mapStoreProduct(response.data?.data || response.data);
};

/**
 * GET /store/products/slug/:slug — single product by its URL slug.
 */
export const getStoreProductBySlug = async (slug: string): Promise<Product> => {
  const response = await api.get(`/store/products/slug/${slug}`);
  return mapStoreProduct(response.data?.data || response.data);
};

/**
 * GET /store/categories — public category listing.
 */
export const getStoreCategories = async (): Promise<Category[]> => {
  const response = await api.get('/store/categories');
  const data = response.data?.data || [];
  return Array.isArray(data) ? data.map(mapStoreCategory) : [];
};

export interface StoreCollection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: {
    url?: string;
    thumbnailUrl?: string;
    alt?: string;
  } | string;
  isFeatured?: boolean;
  status?: string;
  sortOrder?: number;
  products?: (string | Product | any)[];
}

export interface StoreCollectionParams {
  page?: number;
  limit?: number;
  [key: string]: any;
}

export interface StoreCollectionsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StoreCollectionsResult {
  collections: StoreCollection[];
  meta: StoreCollectionsMeta;
}

const mapStoreCollection = (c: any): StoreCollection => ({
  id: c._id || c.id,
  name: c.name,
  slug: c.slug || c._id || c.id,
  description: c.description || '',
  image: c.image,
  isFeatured: !!c.isFeatured,
  status: c.status,
  sortOrder: c.sortOrder ?? 0,
  products: Array.isArray(c.products) ? c.products : [],
});

/**
 * Storefront shows ACTIVE collections only. INACTIVE (or isActive: false, or any other value) is hidden.
 * A collection with no status at all is treated as active (the public endpoint may omit it).
 */
export const isActiveCollection = (c: any): boolean => {
  if (!c) return false;
  if (c.isActive === false) return false;
  if (c.status === undefined || c.status === null || c.status === '') return true;
  return String(c.status).trim().toUpperCase() === 'ACTIVE';
};

/** Raw list from GET /store/collections (public endpoint only, never the admin one) */
const fetchActiveCollections = async (params?: StoreCollectionParams): Promise<StoreCollection[]> => {
  const response = await api.get('/store/collections', { params });
  const rawData = response.data?.data ?? response.data;
  const list = Array.isArray(rawData) ? rawData : rawData?.collections || rawData?.items || [];
  return Array.isArray(list) ? list.filter(isActiveCollection).map(mapStoreCollection) : [];
};

// Short-lived cache so the home page tiles don't refetch the full list for every page change
const ACTIVE_COLLECTIONS_TTL_MS = 60_000;
let activeCollectionsCache: { at: number; promise: Promise<StoreCollection[]> } | null = null;

/** All ACTIVE collections, sorted by sortOrder. Cached for 60s and shared by header, menus and pages. */
export const getCachedActiveCollections = (): Promise<StoreCollection[]> => {
  if (!activeCollectionsCache || Date.now() - activeCollectionsCache.at > ACTIVE_COLLECTIONS_TTL_MS) {
    const promise = fetchActiveCollections({ limit: 100 }).then(list =>
      [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    );
    activeCollectionsCache = { at: Date.now(), promise };
    promise.catch(() => {
      activeCollectionsCache = null; // allow a retry
    });
  }
  return activeCollectionsCache.promise;
};

/**
 * One page of ACTIVE collections (e.g. limit=1 for 1 at a time).
 * Pages are cut client-side from the active list, so an inactive collection can never
 * take a slot or leave a gap in the page count.
 */
export const getStoreCollectionPage = async (
  page: number = 1,
  limit: number = 1
): Promise<StoreCollectionsResult> => {
  try {
    const all = await getCachedActiveCollections();
    const safeLimit = Math.max(1, limit);
    const totalPages = Math.max(1, Math.ceil(all.length / safeLimit));
    const start = (page - 1) * safeLimit;
    return {
      collections: all.slice(start, start + safeLimit),
      meta: { total: all.length, page, limit: safeLimit, totalPages },
    };
  } catch (error) {
    console.warn('Failed to load store collection page from API:', error);
    return {
      collections: [],
      meta: { total: 0, page, limit, totalPages: 1 },
    };
  }
};

/**
 * GET /store/collections — public collections listing, ACTIVE collections only.
 */
export const getStoreCollections = async (params?: StoreCollectionParams): Promise<StoreCollection[]> => {
  try {
    // No params: the full cached list (the endpoint defaults to 20 per page, which could cut collections off)
    return params ? await fetchActiveCollections(params) : await getCachedActiveCollections();
  } catch (error) {
    console.warn('Failed to load store collections from API:', error);
    return [];
  }
};

/**
 * GET /store/collections/{slug} — one ACTIVE collection.
 * Tries direct slug route, and falls back to looking up in the active collections list
 * by slug, id, or name.
 */
export const getStoreCollectionBySlug = async (slug: string): Promise<StoreCollection | null> => {
  if (!slug) return null;
  const decoded = decodeURIComponent(slug).trim();

  // 1. Direct GET /store/collections/{slug}
  try {
    const response = await api.get(`/store/collections/${encodeURIComponent(decoded)}`);
    const raw = response.data?.data ?? response.data;
    if (raw && isActiveCollection(raw)) {
      return mapStoreCollection(raw);
    }
  } catch (error: any) {
    if (error?.response?.status !== 404) {
      console.warn('Direct store collection lookup by slug failed:', error);
    }
  }

  // 2. Direct GET /store/collections/id/{slug} (if slug is a mongo ID)
  try {
    const response = await api.get(`/store/collections/id/${encodeURIComponent(decoded)}`);
    const raw = response.data?.data ?? response.data;
    if (raw && isActiveCollection(raw)) {
      return mapStoreCollection(raw);
    }
  } catch {
    // fallback
  }

  // 3. Fallback: match from the cached active collections list
  try {
    const all = await getCachedActiveCollections();
    const target = decoded.toLowerCase();
    const found = all.find(
      c =>
        c.slug?.toLowerCase() === target ||
        c.id?.toLowerCase() === target ||
        c.name?.toLowerCase() === target
    );
    if (found) return found;
  } catch (err) {
    console.warn('Fallback getCachedActiveCollections lookup failed:', err);
  }

  return null;
};

// -----------------------------------------------------------------------------
// GET /store/settings — public storefront boutique profile & shipping tariffs
// -----------------------------------------------------------------------------

export interface StoreBoutiqueProfile {
  legalName?: string;
  tagline?: string;
  whatsappNumber?: string;
  supportEmail?: string;
  gstin?: string;
  currency?: string;
  timezone?: string;
  address?: string;
}

export interface StoreShippingSettings {
  freeShippingMinOrder?: number;
  standardTariff?: number;
  expressTariff?: number;
}

export interface StoreSettings {
  boutiqueProfile?: StoreBoutiqueProfile;
  shipping?: StoreShippingSettings;
}

/**
 * GET /store/settings — public boutique profile (name, tagline, contact details) & shipping tariffs.
 */
export const getStoreSettings = async (): Promise<StoreSettings> => {
  const response = await api.get('/store/settings');
  return response.data?.data || {};
};

// -----------------------------------------------------------------------------
// GET /products/search — Search and filter products (Customer/Admin)
// -----------------------------------------------------------------------------

export interface ProductSearchParams {
  q?: string;
  categoryId?: string;
  subcategoryId?: string;
  collectionId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  hasDiscount?: boolean;
  availability?: string;
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
  /** Single variant size, e.g. "M" */
  size?: string;
  /** Multiple variant sizes; sent as a comma-separated list, e.g. sizes=XS,S,M */
  sizes?: string[] | string;
  sort?: string; // 'featured' | 'newest' | 'price_asc' | 'price_desc'
  page?: number;
  limit?: number;
}

// Exact query param names accepted by GET /products/search (Swagger)
const PRODUCT_SEARCH_KEYS = [
  'q', 'categoryId', 'subcategoryId', 'collectionId', 'brand',
  'minPrice', 'maxPrice', 'hasDiscount', 'availability', 'size', 'sizes',
  'featured', 'newArrival', 'bestSeller', 'sort', 'page', 'limit',
] as const;

const NUMERIC_KEYS = new Set<string>(['minPrice', 'maxPrice', 'page', 'limit']);
const BOOLEAN_KEYS = new Set<string>(['hasDiscount', 'featured', 'newArrival', 'bestSeller']);
const EMPTY_VALUES = new Set(['', 'all', 'undefined', 'null', 'nan']);

/**
 * Builds a clean query object for GET /products/search:
 * - only the Swagger param names are sent
 * - empty / null / undefined / "all" / NaN values are dropped
 * - numbers and booleans are normalised; size lists become "XS,S,M"
 */
export const buildProductQuery = (params: ProductSearchParams = {}): Record<string, string | number | boolean> => {
  const query: Record<string, string | number | boolean> = {};

  for (const key of PRODUCT_SEARCH_KEYS) {
    const value: unknown = params[key];
    if (value === undefined || value === null) continue;

    if (NUMERIC_KEYS.has(key)) {
      const num = typeof value === 'number' ? value : Number(String(value).trim());
      if (String(value).trim() === '' || !Number.isFinite(num) || num < 0) continue;
      if ((key === 'page' || key === 'limit') && num < 1) continue;
      query[key] = key === 'page' || key === 'limit' ? Math.floor(num) : num;
      continue;
    }

    if (BOOLEAN_KEYS.has(key)) {
      if (typeof value === 'boolean') query[key] = value;
      else if (value === 'true' || value === 'false') query[key] = value === 'true';
      continue;
    }

    if (Array.isArray(value)) {
      const list = value.map(v => String(v).trim()).filter(v => v && !EMPTY_VALUES.has(v.toLowerCase()));
      if (list.length > 0) query[key] = Array.from(new Set(list)).join(',');
      continue;
    }

    const str = String(value).trim();
    if (!EMPTY_VALUES.has(str.toLowerCase())) query[key] = str;
  }

  return query;
};

/** True when a request was cancelled via AbortController (stale request, not an error to show). */
export const isRequestCanceled = (err: unknown): boolean => {
  const e = err as { name?: string; code?: string } | null;
  return !!e && (e.name === 'CanceledError' || e.name === 'AbortError' || e.code === 'ERR_CANCELED');
};

export interface ProductSearchPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

export interface ProductSearchResult {
  products: Product[];
  pagination: ProductSearchPagination;
}

/**
 * GET /products/search — Search and filter products (Customer/Admin)
 * Supports query, collectionId, categoryId, subcategoryId, price, discount, sort, and pagination.
 */
export const searchProducts = async (
  params?: ProductSearchParams,
  categoryMap?: Record<string, string>,
  signal?: AbortSignal
): Promise<ProductSearchResult> => {
  const query = buildProductQuery(params);
  const response = await api.get('/products/search', signal ? { params: query, signal } : { params: query });
  const data = response.data?.data || {};
  const rawProducts = Array.isArray(data) ? data : (data.products || []);
  const pagination: ProductSearchPagination = data.pagination || response.data?.meta || {
    page: Number(query.page) || 1,
    limit: Number(query.limit) || rawProducts.length || 20,
    total: rawProducts.length,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return {
    products: Array.isArray(rawProducts) ? rawProducts.map((p: any) => mapStoreProduct(p, categoryMap)) : [],
    pagination,
  };
};


