import type { Product } from './index';

// Storefront-facing promotions (GET /api/v1/promotions).
// Kept separate from the admin `AdminPromotion` type in `src/types/promotion.ts`.

export type PromotionScopeType = 'PRODUCTS' | 'CATEGORIES' | 'COLLECTIONS' | 'ALL';

export interface StorePromotionRef {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  image?: string | { url?: string; thumbnailUrl?: string };
}

export interface StorePromotionDiscount {
  type: 'PERCENTAGE' | 'FIXED' | string;
  value: number;
  maxDiscountAmount?: number;
}

export interface StorePromotionImageItem {
  url?: string;
  thumbnailUrl?: string;
  isPrimary?: boolean;
}

/** Admin-uploaded promotion banner background (GET /promotions). Absent/null when not set. */
export interface StorePromotionBackgroundImage {
  url: string;
  thumbnailUrl?: string;
  alt?: string;
}

export interface StorePromotionVariant {
  id?: string;
  sku?: string;
  pricing?: {
    sellingPrice?: number;
    mrp?: number;
    currency?: string;
  };
  sellingPrice?: number;
  mrp?: number;
  status?: string;
  isActive?: boolean;
}

/** Backward compatibility alias for Product */
export type StorePromotionProduct = Product;

export interface StorePromotionCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string | { url?: string; thumbnailUrl?: string };
}

export interface StorePromotionCollection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string | { url?: string; thumbnailUrl?: string };
}

export interface StorePromotionApplicableTo {
  type: PromotionScopeType;
  products?: StorePromotionRef[];
  categories?: StorePromotionRef[];
  collections?: StorePromotionRef[];
}

export interface StorePromotion {
  id: string;
  name: string;
  description?: string;
  discount: StorePromotionDiscount;
  applicableTo: StorePromotionApplicableTo;
  minimumOrderValue?: number;
  startsAt: string;
  expiresAt: string;
  /** Complete store Product objects (reusing src/components/ui/ProductCard) */
  products: Product[];
  categories: StorePromotionCategory[];
  collections: StorePromotionCollection[];
  totalProducts?: number;
  hasMoreProducts?: boolean;
  /** Priority / display order from backend if provided */
  priority?: number;
  displayOrder?: number;
  sortOrder?: number;
  /** Optional admin-uploaded banner background; absent/undefined when the promotion has none. */
  backgroundImage?: StorePromotionBackgroundImage;
  /** Controls which elements appear on the promotion banner (6 keys) */
  displayOptions?: { key: string; enabled: boolean }[];
}
