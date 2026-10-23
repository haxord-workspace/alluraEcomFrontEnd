import api from './api';
import adminApi from './adminApi';
import { getAdminAccessToken } from '../store/slices/adminAuthSlice';
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
    stockOnHand: raw.stockOnHand ?? raw.inventory?.quantityOnHand ?? 0,
    stockReserved: raw.stockReserved ?? raw.inventory?.quantityReserved ?? 0,
    stockAvailable: raw.stockAvailable ?? raw.inventory?.quantityAvailable ?? 0,
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

/**
 * GET /store/collections — fetch a single page of collections (e.g. limit=1 for 1 at a time).
 */
export const getStoreCollectionPage = async (
  page: number = 1,
  limit: number = 1
): Promise<StoreCollectionsResult> => {
  try {
    const response = await api.get('/store/collections', {
      params: { page, limit },
    });
    const rawData = response.data?.data || response.data || [];
    const rawMeta = response.data?.meta || {};
    const collections: StoreCollection[] = Array.isArray(rawData)
      ? rawData.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || '',
          image: c.image,
          isFeatured: !!c.isFeatured,
          status: c.status,
          sortOrder: c.sortOrder ?? 0,
        }))
      : [];

    const meta: StoreCollectionsMeta = {
      total: rawMeta.total ?? collections.length,
      page: rawMeta.page ?? page,
      limit: rawMeta.limit ?? limit,
      totalPages: rawMeta.totalPages ?? Math.max(1, Math.ceil((rawMeta.total ?? collections.length) / limit)),
    };

    return { collections, meta };
  } catch (error) {
    console.warn('Failed to load store collection page from API:', error);
    return {
      collections: [],
      meta: { total: 0, page, limit, totalPages: 1 },
    };
  }
};

/**
 * GET /store/collections — public collections listing.
 */
export const getStoreCollections = async (params?: StoreCollectionParams): Promise<StoreCollection[]> => {
  try {
    let data: any[] = [];
    const token = getAdminAccessToken();
    if (token) {
      try {
        const adminRes = await adminApi.get('/collections', { params });
        data = adminRes.data?.data || adminRes.data || [];
      } catch (e) {
        console.warn('Failed to load collections from admin endpoint, falling back to store endpoint', e);
      }
    }
    if (!data || data.length === 0) {
      const response = await api.get('/store/collections', { params });
      data = response.data?.data || response.data || [];
    }

    return Array.isArray(data)
      ? data.map((c: any) => ({
          id: c._id || c.id,
          name: c.name,
          slug: c.slug,
          description: c.description || '',
          image: c.image,
          isFeatured: !!c.isFeatured,
          status: c.status,
          sortOrder: c.sortOrder ?? 0,
        }))
      : [];
  } catch (error) {
    console.warn('Failed to load store collections from API, falling back to local collections:', error);
    return [];
  }
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
  sort?: string; // 'featured' | 'newest' | 'price_asc' | 'price_desc'
  page?: number;
  limit?: number;
}

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
  categoryMap?: Record<string, string>
): Promise<ProductSearchResult> => {
  const response = await api.get('/products/search', { params });
  const data = response.data?.data || {};
  const rawProducts = data.products || [];
  const pagination: ProductSearchPagination = data.pagination || {
    page: params?.page || 1,
    limit: params?.limit || rawProducts.length || 20,
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


