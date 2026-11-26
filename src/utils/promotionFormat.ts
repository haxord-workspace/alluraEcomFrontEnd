import type { StorePromotion, StorePromotionRef } from '../types/storePromotion';

const currencyFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const percentFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

export const formatCurrency = (value: number): string => `₹${currencyFormatter.format(Math.max(0, Math.round(value || 0)))}`;

export interface DiscountLabel {
  main: string;
  sub?: string;
}

export interface DiscountParts {
  /** Numeric/currency portion only — no unit, e.g. "5" or "₹500" */
  value: string;
  /** "%" for percentage discounts, "" for fixed-amount ones (the currency symbol already lives in `value`) */
  unit: string;
  /** "OFF", or "" for the unrecognised-type fallback where `value` is the promotion name instead */
  label: string;
}

const FIXED_AMOUNT_TYPES = ['FIXED', 'FLAT', 'AMOUNT'];

export function getDiscountParts(promotion: StorePromotion): DiscountParts {
  const { discount } = promotion;
  const type = (discount?.type || '').toUpperCase();

  if (type === 'PERCENTAGE') {
    return {
      value: percentFormatter.format(Math.max(0, discount.value || 0)),
      unit: '%',
      label: 'OFF',
    };
  }

  if (FIXED_AMOUNT_TYPES.includes(type)) {
    return {
      value: formatCurrency(discount.value || 0),
      unit: '',
      label: 'OFF',
    };
  }

  return {
    value: promotion.name,
    unit: '',
    label: '',
  };
}

export function formatValidityPeriod(startsAt?: string, expiresAt?: string): string | null {
  if (!expiresAt) return null;
  try {
    const end = new Date(expiresAt);
    if (Number.isNaN(end.getTime())) return null;

    const formatter = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (startsAt) {
      const start = new Date(startsAt);
      if (!Number.isNaN(start.getTime())) {
        return `Valid ${formatter.format(start)} – ${formatter.format(end)}`;
      }
    }
    return `Valid until ${formatter.format(end)}`;
  } catch {
    return null;
  }
}

export function getPromotionEyebrow(startsAt?: string, expiresAt?: string): string {
  const now = Date.now();
  if (startsAt) {
    const startTime = new Date(startsAt).getTime();
    if (now < startTime) return 'UPCOMING';
  }
  if (expiresAt) {
    const endTime = new Date(expiresAt).getTime();
    const diff = endTime - now;
    if (diff > 0 && diff < 6 * 3600 * 1000) return 'ENDING SOON';
  }
  return 'LIMITED OFFER';
}

/** Defensive against undocumented `discount.type` values — unknown types fall back to the promo name. */
export function getDiscountLabel(promotion: StorePromotion): DiscountLabel {
  const { discount } = promotion;
  const type = (discount.type || '').toUpperCase();

  if (type === 'PERCENTAGE') {
    return {
      main: `${discount.value}% OFF`,
      sub: discount.maxDiscountAmount > 0 ? `Up to ${formatCurrency(discount.maxDiscountAmount)}` : undefined,
    };
  }
  if (FIXED_AMOUNT_TYPES.includes(type)) {
    return { main: `${formatCurrency(discount.value)} OFF` };
  }
  return { main: promotion.name };
}

export function getMinimumOrderLabel(promotion: StorePromotion): string | null {
  return promotion.minimumOrderValue > 0 ? `On orders above ${formatCurrency(promotion.minimumOrderValue)}` : null;
}

export interface ApplicableChip extends StorePromotionRef {
  /** null when the API gives only an id and the route needs a slug — chip renders non-clickable */
  href: string | null;
}

export interface ApplicableGroup {
  label: string;
  kind: 'products' | 'categories' | 'collections' | 'all';
  items: ApplicableChip[];
}

/** `/shop?category=` takes the category name, so categories are the one group we can link reliably. */
const categoryHref = (item: StorePromotionRef): string => `/shop?category=${encodeURIComponent(item.name)}`;

/** Decided from whichever `applicableTo` arrays are non-empty; `applicableTo.type` is only a hint. */
export function getApplicableGroups(promotion: StorePromotion): ApplicableGroup[] {
  const { applicableTo } = promotion;
  const groups: ApplicableGroup[] = [];

  if (applicableTo.categories.length) {
    groups.push({
      label: 'Applies to categories',
      kind: 'categories',
      items: applicableTo.categories.map((item) => ({ ...item, href: categoryHref(item) })),
    });
  }
  if (applicableTo.collections.length) {
    // /collections/:slug — the API gives only id/name, so these chips are not clickable (see backend notes)
    groups.push({
      label: 'Applies to collections',
      kind: 'collections',
      items: applicableTo.collections.map((item) => ({ ...item, href: null })),
    });
  }
  if (applicableTo.products.length) {
    groups.push({
      label: 'Applies to products',
      kind: 'products',
      items: applicableTo.products.map((item) => ({
        ...item,
        href: item.slug ? `/product/${item.slug}` : null,
      })),
    });
  }
  if (!groups.length) {
    groups.push({ label: 'Sitewide: all products', kind: 'all', items: [] });
  }
  return groups;
}

/** Single category -> its page (name-based route). Everything else -> /shop (no slug to link a single collection/product). */
export function getCtaDestination(promotion: StorePromotion): string {
  const { applicableTo } = promotion;

  if (applicableTo.products.length === 1 && applicableTo.products[0].slug) {
    return `/product/${applicableTo.products[0].slug}`;
  }

  const groupCount = [applicableTo.categories.length, applicableTo.collections.length, applicableTo.products.length].filter(
    (n) => n > 0,
  ).length;

  if (groupCount === 1 && applicableTo.categories.length === 1) {
    return categoryHref(applicableTo.categories[0]);
  }
  return '/shop';
}
