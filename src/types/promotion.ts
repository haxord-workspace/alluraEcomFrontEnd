// -----------------------------------------------------------------------------
// Admin Promotions (real API). Kept separate from the `Promotion` type in
// `src/types/index.ts`, which still backs AdminContext's mock `promotions` /
// `addPromotion` used by the storefront's OffersPage — do not merge these.
//
// Schema confirmed against the live backend's own validation error for
// POST /admin/promotions (field names, discount-as-object, and the real
// status enum DRAFT|ACTIVE|INACTIVE|EXPIRED all came from that response),
// cross-checked against `src/service/coupons.ts`'s already-working
// `discount: { type, value, maxDiscountAmount }` / `startsAt` / `expiresAt`
// shape on the same backend.
// -----------------------------------------------------------------------------

/** UI-facing status. "Paused" is shown instead of "Inactive" so StatusBadge's
 *  substring color matching ("inactive".includes("active")) doesn't paint it
 *  the same green as Active — same convention `coupons.ts` already uses. */
export type PromotionStatus = 'Active' | 'Paused' | 'Draft' | 'Expired';

export type PromotionDiscountType = 'Percentage' | 'Fixed';

/** `applicableTo.type` enum, from the Swagger PromotionInput / PromotionUpdateInput schemas. */
export const PROMOTION_SCOPE_TYPES = ['ALL', 'PRODUCTS', 'CATEGORIES', 'COLLECTIONS'] as const;
export type PromotionScopeType = (typeof PROMOTION_SCOPE_TYPES)[number];

export const PROMOTION_SCOPE_LABELS: Record<PromotionScopeType, string> = {
  ALL: 'All products',
  PRODUCTS: 'Specific products',
  CATEGORIES: 'Specific categories',
  COLLECTIONS: 'Specific collections',
};

/** What the promotion applies to (Swagger: `applicableTo`). Ids are strings. */
export interface PromotionApplicableTo {
  type: PromotionScopeType;
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
}

export interface AdminPromotion {
  id: string;
  name: string;
  /** Free-text campaign type (e.g. "Tiered Discount"); the backend's exact enum is unconfirmed. */
  type: string;
  /** Shown as "Conditions" in the form; stored by the backend as `description`. */
  conditions: string;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  startDate: string;
  endDate: string;
  status: PromotionStatus;
  /** Replaced by Applies to > Categories; no longer used (the backend has no such field). */
  eligibleCategories: string[];
  applicableTo: PromotionApplicableTo;
  excludedProducts: string[];
  excludedCategories: string[];
  /** Evaluation order, higher first; qualifying promotions stack (Swagger `priority`). */
  priority: number;
}

/** Body for POST/PATCH /admin/promotions. Only `name`, `discount`, `startsAt`,
 *  `expiresAt` and `status` are confirmed by the backend's validation error;
 *  `type`/`conditions`/`eligibleCategories` are still best-guess (unconfirmed
 *  but unchallenged — no error was raised for them). */
export interface PromotionInput {
  name: string;
  /** Campaign Type. Not in the Swagger schema — the backend does not store it. */
  type?: string;
  /** Not in the Swagger schema; the form's Conditions is now sent as `description`. */
  conditions?: string;
  description?: string;
  applicableTo?: PromotionApplicableTo;
  excludedProducts?: string[];
  excludedCategories?: string[];
  /** Integer; no minimum in the spec. */
  priority?: number;
  discount: {
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    maxDiscountAmount?: number;
  };
  /** ISO datetime string, e.g. new Date(...).toISOString() */
  startsAt: string;
  /** ISO datetime string, e.g. new Date(...).toISOString() */
  expiresAt: string;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'EXPIRED';
  /** Replaced by Applies to > Categories; no longer used (no longer sent). */
  eligibleCategories?: string[];
}

/** Starting set of campaign types, taken from the existing mock data. Free text is also allowed. */
export const PROMOTION_TYPES = ['Tiered Discount', 'Buy X Get Y', 'Free Shipping Gift', 'Flash Sale'] as const;

export const PROMOTION_STATUSES: PromotionStatus[] = ['Active', 'Paused', 'Draft', 'Expired'];
