import type { PromotionScopeType } from '../types/promotion';

// -----------------------------------------------------------------------------
// Validation for the Applies to / Exclusions / Priority fields of the admin
// promotion form (src/pages/admin/AdminPromotionsPage.tsx).
//
// CONFIRM WITH BACKEND: the Swagger spec documents the field names and enums but
// not these rules. They are the agreed frontend defaults until the backend
// developer confirms them.
// -----------------------------------------------------------------------------

export const PROMOTION_RULES = {
  /** Percent Off range (the existing form check also enforces <= 100). */
  percentMin: 1,
  percentMax: 100,
  /** Which id list must have at least one entry for each applicableTo.type. */
  requiredIdsFor: {
    PRODUCTS: 'productIds',
    CATEGORIES: 'categoryIds',
    COLLECTIONS: 'collectionIds',
  } as Partial<Record<PromotionScopeType, 'productIds' | 'categoryIds' | 'collectionIds'>>,
  /** Exclusion pickers are offered (and sent) only for these types. */
  exclusionsAllowedFor: ['ALL', 'CATEGORIES', 'COLLECTIONS'] as PromotionScopeType[],
  /** The same id may not be both included and excluded. */
  allowIncludedAndExcluded: false,
  /** Priority must be an integer; the spec sets no minimum. */
  priorityMin: undefined as number | undefined,
} as const;

export const scopeAllowsExclusions = (type: PromotionScopeType) =>
  PROMOTION_RULES.exclusionsAllowedFor.includes(type);

export interface PromotionScopeValues {
  scopeType: PromotionScopeType;
  productIds: string[];
  categoryIds: string[];
  collectionIds: string[];
  excludedProducts: string[];
  excludedCategories: string[];
  /** Raw text from the number input */
  priority: string;
}

/** Field errors keyed by the payload path, so backend errors can use the same keys. */
export type PromotionFieldErrors = Partial<
  Record<'applicableTo' | 'excludedProducts' | 'excludedCategories' | 'priority', string>
>;

const NOUN: Record<'productIds' | 'categoryIds' | 'collectionIds', string> = {
  productIds: 'product',
  categoryIds: 'category',
  collectionIds: 'collection',
};

export const validatePromotionScope = (values: PromotionScopeValues): PromotionFieldErrors => {
  const errors: PromotionFieldErrors = {};

  const requiredList = PROMOTION_RULES.requiredIdsFor[values.scopeType];
  if (requiredList && values[requiredList].length === 0) {
    errors.applicableTo = `Select at least one ${NOUN[requiredList]}.`;
  }

  if (!PROMOTION_RULES.allowIncludedAndExcluded && scopeAllowsExclusions(values.scopeType)) {
    const included = new Set(values.scopeType === 'CATEGORIES' ? values.categoryIds : []);
    if (values.excludedCategories.some(id => included.has(id))) {
      errors.excludedCategories = 'A category cannot be both included and excluded.';
    }
  }

  const raw = values.priority.trim();
  if (raw !== '') {
    const n = Number(raw);
    if (!Number.isInteger(n)) {
      errors.priority = 'Priority must be a whole number.';
    } else if (PROMOTION_RULES.priorityMin !== undefined && n < PROMOTION_RULES.priorityMin) {
      errors.priority = `Priority must be ${PROMOTION_RULES.priorityMin} or more.`;
    }
  }

  return errors;
};
