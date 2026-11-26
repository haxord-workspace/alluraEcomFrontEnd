// Storefront-facing promotions (GET /promotions). Kept separate from the admin
// `AdminPromotion` type in `src/types/promotion.ts` — different endpoint, different shape.

export interface StorePromotionRef {
  id: string;
  name: string;
  slug?: string;
}

export interface StorePromotionDiscount {
  /** Backend enum is not fully documented; treated defensively (see utils/promotionFormat.ts) */
  type: string;
  value: number;
  maxDiscountAmount: number;
}

export interface StorePromotionApplicableTo {
  /** Hint only — which arrays are non-empty is what actually decides scope */
  type: string;
  products: StorePromotionRef[];
  categories: StorePromotionRef[];
  collections: StorePromotionRef[];
}

export interface StorePromotion {
  id: string;
  name: string;
  description: string;
  discount: StorePromotionDiscount;
  applicableTo: StorePromotionApplicableTo;
  minimumOrderValue: number;
  startsAt: string;
  expiresAt: string;
}
