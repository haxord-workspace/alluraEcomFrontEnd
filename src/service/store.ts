import api from './api';
import type { Product, ProductColor, Category } from '../types';

// -----------------------------------------------------------------------------
// Storefront (public, unauthenticated) product & category endpoints
// GET /store/products, GET /store/products/:id, GET /store/products/slug/:slug,
// GET /store/categories
// -----------------------------------------------------------------------------

const FALLBACK_IMAGE = '/images/best-sellers/classic-cream-anarkali.jpeg';
const DEFAULT_COLOR: ProductColor = { name: 'Standard', hex: '#D9C9B4' };
const DEFAULT_SIZES = ['Free Size'];

const mapStatus = (status?: string): Product['status'] => {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'DRAFT') return 'Draft';
  if (status === 'ARCHIVED') return 'Archived';
  return undefined;
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

  const colors: ProductColor[] = Array.isArray(raw.colors) && raw.colors.length > 0 ? raw.colors : [DEFAULT_COLOR];
  const sizes: string[] = Array.isArray(raw.sizes) && raw.sizes.length > 0 ? raw.sizes : DEFAULT_SIZES;

  return {
    id: raw.id || raw._id,
    slug: raw.slug || raw.id || raw._id,
    name: raw.name,
    price: raw.pricing?.sellingPrice ?? 0,
    originalPrice: raw.pricing?.mrp,
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
  const data = response.data?.data || [];
  const meta: StoreProductsMeta = response.data?.meta || {
    total: data.length,
    page: 1,
    limit: data.length,
    totalPages: 1,
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
