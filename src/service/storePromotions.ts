import api from './api';
import { mapStoreProduct } from './store';
import { toNumber } from '../utils/number';
import type { Product } from '../types';
import type {
  StorePromotion,
  StorePromotionCategory,
  StorePromotionCollection,
  StorePromotionRef,
  StorePromotionBackgroundImage,
  PromotionScopeType,
} from '../types/storePromotion';

const unwrap = (response: any): unknown => {
  const data = response?.data;
  return data?.data?.promotions ?? data?.promotions ?? data?.data ?? data ?? [];
};

const FALLBACK_IMAGE = '/images/best-sellers/classic-cream-anarkali.jpeg';

const toRefArray = (value: unknown): StorePromotionRef[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => ({
      id: String(item.id ?? item._id ?? ''),
      name: typeof item.name === 'string' ? item.name : '',
      slug: typeof item.slug === 'string' ? item.slug : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
      image: (item.image as any) || undefined,
    }))
    .filter((item) => item.id);
};

const mapPromotionCategory = (raw: any): StorePromotionCategory => {
  const id = String(raw?.id ?? raw?._id ?? '');
  return {
    id,
    name: typeof raw?.name === 'string' ? raw.name : '',
    slug: typeof raw?.slug === 'string' ? raw.slug : id,
    description: typeof raw?.description === 'string' ? raw.description : undefined,
    image: raw?.image,
  };
};

const mapPromotionCollection = (raw: any): StorePromotionCollection => {
  const id = String(raw?.id ?? raw?._id ?? '');
  return {
    id,
    name: typeof raw?.name === 'string' ? raw.name : '',
    slug: typeof raw?.slug === 'string' ? raw.slug : id,
    description: typeof raw?.description === 'string' ? raw.description : undefined,
    image: raw?.image,
  };
};

/**
 * Maps promotion raw product into frontend Product type used by `/shop` ProductCard.
 * Follows required image priority and pricing rules.
 */
const mapPromotionProduct = (raw: any): Product => {
  // Base map from existing store service
  const base = mapStoreProduct(raw);

  // 1. Image priority handling:
  // 1) primaryImage.thumbnailUrl, 2) primaryImage.url, 3) first available image.thumbnailUrl, 4) first available image.url, 5) placeholder
  let primary = '';
  let thumbnail = '';

  const priObj = raw?.primaryImage;
  const rawImages = Array.isArray(raw?.images) ? raw.images : [];

  if (priObj && typeof priObj === 'object') {
    if (priObj.thumbnailUrl) {
      thumbnail = priObj.thumbnailUrl;
      primary = priObj.url || priObj.thumbnailUrl;
    } else if (priObj.url) {
      primary = priObj.url;
      thumbnail = priObj.url;
    }
  }

  if (!primary && rawImages.length > 0) {
    const first = rawImages[0];
    if (typeof first === 'object' && first) {
      thumbnail = first.thumbnailUrl || first.url || '';
      primary = first.url || first.thumbnailUrl || '';
    } else if (typeof first === 'string') {
      primary = first;
      thumbnail = first;
    }
  }

  if (!primary) {
    primary = base.images.primary || FALLBACK_IMAGE;
    thumbnail = base.images.thumbnail || primary;
  }

  // 2. Variant pricing logic:
  // If product has active variants with different prices, find lowest variant sellingPrice and flag hasPriceRange.
  const rawVariants = Array.isArray(raw?.variants) ? raw.variants : [];
  const activeVariants = rawVariants.filter(
    (v: any) => v && (v.status === 'ACTIVE' || v.isActive !== false)
  );

  let sellingPrice = toNumber(raw?.pricing?.sellingPrice ?? raw?.sellingPrice ?? base.price) ?? 0;
  let mrp = toNumber(raw?.pricing?.mrp ?? raw?.mrp ?? base.originalPrice);
  let hasPriceRange = false;

  if (activeVariants.length > 0) {
    const variantPrices = activeVariants
      .map((v: any) => toNumber(v?.pricing?.sellingPrice ?? v?.sellingPrice ?? v?.price))
      .filter((p: number | undefined): p is number => typeof p === 'number' && p > 0);

    if (variantPrices.length > 0) {
      const minVPrice = Math.min(...variantPrices);
      const maxVPrice = Math.max(...variantPrices);
      if (minVPrice < maxVPrice) {
        hasPriceRange = true;
        sellingPrice = minVPrice;
      } else {
        sellingPrice = minVPrice;
      }
    }
  }

  // Only show originalPrice (MRP strikethrough) if mrp > sellingPrice
  const originalPrice = mrp && mrp > sellingPrice ? mrp : undefined;

  // Category name extraction
  let categoryName = base.category;
  if (!categoryName) {
    if (typeof raw?.categoryName === 'string') {
      categoryName = raw.categoryName;
    } else if (typeof raw?.category === 'string') {
      categoryName = raw.category;
    } else if (raw?.category && typeof raw.category === 'object' && raw.category.name) {
      categoryName = raw.category.name;
    }
  }

  return {
    ...base,
    name: raw?.name || base.name,
    slug: raw?.slug || base.slug,
    category: categoryName,
    price: sellingPrice,
    originalPrice,
    hasPriceRange,
    isNewArrival: Boolean(raw?.isNewArrival),
    isBestSeller: Boolean(raw?.isBestSeller),
    isFeatured: Boolean(raw?.isFeatured),
    images: {
      ...base.images,
      primary,
      thumbnail: thumbnail || primary,
    },
  };
};

/** Only a non-empty, trimmed `url` counts as a usable background image. */
const mapBackgroundImage = (raw: any): StorePromotionBackgroundImage | undefined => {
  const img = raw?.backgroundImage;
  const url = typeof img?.url === 'string' ? img.url.trim() : '';
  if (!url) return undefined;
  return {
    url,
    thumbnailUrl: typeof img?.thumbnailUrl === 'string' ? img.thumbnailUrl : undefined,
    alt: typeof img?.alt === 'string' ? img.alt : undefined,
  };
};

/** Deduplicates products by id or slug while preserving order */
const deduplicateProducts = (products: Product[]): Product[] => {
  const seen = new Set<string>();
  const result: Product[] = [];
  for (const p of products) {
    const key = p.id || p.slug;
    if (key && !seen.has(key)) {
      seen.add(key);
      result.push(p);
    }
  }
  return result;
};

const mapPromotion = (raw: any): StorePromotion => {
  const rawScope = String(raw?.applicableTo?.type ?? 'ALL').toUpperCase();
  const validScopes: PromotionScopeType[] = ['PRODUCTS', 'CATEGORIES', 'COLLECTIONS', 'ALL'];
  const scopeType: PromotionScopeType = validScopes.includes(rawScope as PromotionScopeType)
    ? (rawScope as PromotionScopeType)
    : 'ALL';

  // Products: backend returns up to 5 products in `products` (or `applicableTo.products`)
  const rawProducts = Array.isArray(raw?.products)
    ? raw.products
    : Array.isArray(raw?.applicableTo?.products)
      ? raw.applicableTo.products
      : [];

  let mappedProducts = deduplicateProducts(
    rawProducts
      .filter((p: any) => p && typeof p === 'object' && (p.id != null || p._id != null || p.name != null))
      .map(mapPromotionProduct)
  );

  // Sorting products based on scopeType:
  // CATEGORIES: featured products first, then newest, preserving relative backend order
  if (scopeType === 'CATEGORIES') {
    mappedProducts.sort((a, b) => {
      const aFeat = a.isFeatured ? 1 : 0;
      const bFeat = b.isFeatured ? 1 : 0;
      if (bFeat !== aFeat) return bFeat - aFeat;

      const aNew = a.isNewArrival ? 1 : 0;
      const bNew = b.isNewArrival ? 1 : 0;
      return bNew - aNew;
    });
  }
  // PRODUCTS & COLLECTIONS: keep exact backend-provided order

  // Retain all products provided by the API without artificial frontend slicing
  // (Backend currently sends up to 5, but frontend is ready for 8, 10 or more)

  // Categories: backend returns applicable categories in `categories` (or `applicableTo.categories`)
  const rawCategories = Array.isArray(raw?.categories)
    ? raw.categories
    : Array.isArray(raw?.applicableTo?.categories)
      ? raw.applicableTo.categories
      : [];

  const mappedCategories = rawCategories
    .filter((c: any) => c && typeof c === 'object')
    .map(mapPromotionCategory);

  // Collections: backend returns applicable collections in `collections` (or `applicableTo.collections`)
  const rawCollections = Array.isArray(raw?.collections)
    ? raw.collections
    : Array.isArray(raw?.applicableTo?.collections)
      ? raw.applicableTo.collections
      : [];

  const mappedCollections = rawCollections
    .filter((col: any) => col && typeof col === 'object')
    .map(mapPromotionCollection);

  const totalProducts =
    typeof raw?.totalProducts === 'number'
      ? raw.totalProducts
      : typeof raw?.applicableProductCount === 'number'
        ? raw.applicableProductCount
        : mappedProducts.length;

  const hasMoreProducts =
    typeof raw?.hasMoreProducts === 'boolean'
      ? raw.hasMoreProducts
      : totalProducts > mappedProducts.length;

  const priorityVal =
    typeof raw?.priority === 'number'
      ? raw.priority
      : typeof raw?.displayOrder === 'number'
        ? raw.displayOrder
        : typeof raw?.sortOrder === 'number'
          ? raw.sortOrder
          : undefined;

  return {
    id: String(raw?.id ?? raw?._id ?? ''),
    name: typeof raw?.name === 'string' ? raw.name : '',
    description: typeof raw?.description === 'string' ? raw.description : undefined,
    discount: {
      type: typeof raw?.discount?.type === 'string' ? raw.discount.type : '',
      value: Number(raw?.discount?.value) || 0,
      maxDiscountAmount:
        Number(raw?.discount?.maxDiscountAmount) > 0 ? Number(raw.discount.maxDiscountAmount) : undefined,
    },
    applicableTo: {
      type: scopeType,
      products: toRefArray(raw?.applicableTo?.products),
      categories: toRefArray(raw?.applicableTo?.categories),
      collections: toRefArray(raw?.applicableTo?.collections),
    },
    minimumOrderValue: Number(raw?.minimumOrderValue) || 0,
    startsAt: typeof raw?.startsAt === 'string' ? raw.startsAt : '',
    expiresAt: typeof raw?.expiresAt === 'string' ? raw.expiresAt : '',
    products: mappedProducts,
    categories: mappedCategories,
    collections: mappedCollections,
    totalProducts,
    hasMoreProducts,
    priority: priorityVal,
    displayOrder: typeof raw?.displayOrder === 'number' ? raw.displayOrder : undefined,
    sortOrder: typeof raw?.sortOrder === 'number' ? raw.sortOrder : undefined,
    backgroundImage: mapBackgroundImage(raw),
    displayOptions: Array.isArray(raw?.displayOptions)
      ? raw.displayOptions.map((o: any) => ({
          key: String(o?.key || ''),
          enabled: Boolean(o?.enabled ?? true),
        }))
      : undefined,
  };
};

// In-flight promise cache to avoid duplicate API requests across concurrent callers / StrictMode
let inFlightRequest: Promise<StorePromotion[]> | null = null;
let cachedResult: { data: StorePromotion[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 15_000; // 15 seconds cache

/** Storefront-facing promotions list. Degrades to [] on any failure — never throws. */
export async function getPublicPromotions(): Promise<StorePromotion[]> {
  const now = Date.now();
  if (cachedResult && now - cachedResult.timestamp < CACHE_TTL_MS) {
    return cachedResult.data;
  }

  if (inFlightRequest) {
    return inFlightRequest;
  }

  inFlightRequest = (async () => {
    try {
      const response = await api.get('/promotions');
      const list = unwrap(response);
      if (!Array.isArray(list)) return [];
      const promotions = list
        .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object' && (item.id != null || item._id != null))
        .map(mapPromotion);

      cachedResult = { data: promotions, timestamp: Date.now() };
      return promotions;
    } catch (error) {
      console.warn('getPublicPromotions failed:', error);
      return [];
    } finally {
      inFlightRequest = null;
    }
  })();

  return inFlightRequest;
}

/** Invalidate cached promotions (e.g. for testing or refresh) */
export function invalidatePromotionsCache(): void {
  cachedResult = null;
  inFlightRequest = null;
}
