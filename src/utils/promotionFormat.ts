import type { StorePromotion, StorePromotionRef } from '../types/storePromotion';

export const FALLBACK_PRODUCT_IMAGE = '/images/best-sellers/classic-cream-anarkali.jpeg';

/**
 * Currency formatter using Intl.NumberFormat('en-IN', { style: 'currency', currency }).
 * Never hardcodes the currency symbol or format.
 */
export function formatCurrency(value?: number | null, currency: string = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(Number(value) || 0)));
  } catch {
    return `₹${Math.max(0, Math.round(Number(value) || 0)).toLocaleString('en-IN')}`;
  }
}

export interface DiscountParts {
  /** Numeric/currency portion only — no unit, e.g. "5" or "₹500" */
  value: string;
  /** "%" for percentage discounts, "" for fixed-amount ones (the currency symbol already lives in `value`) */
  unit: string;
  /** "OFF", or "" for the unrecognised-type fallback */
  label: string;
}

export interface DiscountLabel {
  main: string;
  sub?: string;
}

const FIXED_AMOUNT_TYPES = ['FIXED', 'FLAT', 'AMOUNT'];

/**
 * Reusable discount formatting utility conforming to:
 * PERCENTAGE:
 * - 5 → 5% OFF
 * - 10 → 10% OFF
 * - If maxDiscountAmount exists: 5% OFF · Up to ₹1,000
 * FIXED:
 * - 500 → ₹500 OFF
 */
export function formatPromotionDiscount(
  discount?: { type?: string; value?: number; maxDiscountAmount?: number } | null,
  currency: string = 'INR'
): string {
  if (!discount) return '';
  const type = (discount.type || '').toUpperCase();
  const val = Number(discount.value) || 0;
  const maxAmount = Number(discount.maxDiscountAmount) || 0;

  if (type === 'PERCENTAGE') {
    const base = `${val}% OFF`;
    if (maxAmount > 0) {
      return `${base} · Up to ${formatCurrency(maxAmount, currency)}`;
    }
    return base;
  }

  if (FIXED_AMOUNT_TYPES.includes(type)) {
    return `${formatCurrency(val, currency)} OFF`;
  }

  return val > 0 ? `${val}% OFF` : '';
}

/**
 * Minimum order requirement:
 * minimumOrderValue = 1500 → On orders above ₹1,500
 */
export function formatMinimumOrder(minimumOrderValue?: number | null, currency: string = 'INR'): string | null {
  if (!minimumOrderValue || minimumOrderValue <= 0) return null;
  return `On orders above ${formatCurrency(minimumOrderValue, currency)}`;
}

export function getDiscountParts(promotion: StorePromotion): DiscountParts {
  const { discount } = promotion;
  const type = (discount?.type || '').toUpperCase();

  if (type === 'PERCENTAGE') {
    return {
      value: String(discount.value || 0),
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

/**
 * Converts UTC datetime to Indian Standard Time (IST, Asia/Kolkata) readable string.
 * Example: 26 Nov 2026, 11:59 PM
 */
export function formatPromotionDate(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Formats validity period in Indian Standard Time (IST, Asia/Kolkata).
 * Example:
 * Valid until 26 Nov 2026, 11:59 PM.
 * or
 * Valid 20 Nov 2026, 10:00 AM – 26 Nov 2026, 11:59 PM.
 */
export function formatValidityPeriod(startsAt?: string, expiresAt?: string): string | null {
  if (!expiresAt) return null;
  try {
    const end = new Date(expiresAt);
    if (Number.isNaN(end.getTime())) return null;

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

export function getPromotionEyebrow(startsAt?: string, expiresAt?: string, scopeType?: string): string {
  if (scopeType === 'ALL') return 'STOREWIDE OFFER';
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

export function getDiscountLabel(promotion: StorePromotion): DiscountLabel {
  const { discount } = promotion;
  const type = (discount?.type || '').toUpperCase();

  if (type === 'PERCENTAGE') {
    return {
      main: `${discount.value}% OFF`,
      sub:
        discount.maxDiscountAmount && discount.maxDiscountAmount > 0
          ? `Up to ${formatCurrency(discount.maxDiscountAmount)}`
          : undefined,
    };
  }
  if (FIXED_AMOUNT_TYPES.includes(type)) {
    return { main: `${formatCurrency(discount.value)} OFF` };
  }
  return { main: promotion.name };
}

export function getMinimumOrderLabel(promotion: StorePromotion): string | null {
  return formatMinimumOrder(promotion.minimumOrderValue);
}

/**
 * Image priority:
 * 1. primaryImage.thumbnailUrl
 * 2. primaryImage.url
 * 3. First available image's thumbnailUrl
 * 4. First available image's url
 * 5. Existing project placeholder image.
 */
export function getProductImage(product?: any): string {
  if (!product) return FALLBACK_PRODUCT_IMAGE;

  // 1. primaryImage.thumbnailUrl
  if (product.primaryImage?.thumbnailUrl && typeof product.primaryImage.thumbnailUrl === 'string') {
    return product.primaryImage.thumbnailUrl;
  }

  // 2. primaryImage.url
  if (product.primaryImage?.url && typeof product.primaryImage.url === 'string') {
    return product.primaryImage.url;
  }

  // Check images array
  const images = Array.isArray(product.images) ? product.images : [];
  if (images.length > 0) {
    const first = images[0];
    if (typeof first === 'object' && first !== null) {
      // 3. First available image's thumbnailUrl
      if (first.thumbnailUrl && typeof first.thumbnailUrl === 'string') {
        return first.thumbnailUrl;
      }
      // 4. First available image's url
      if (first.url && typeof first.url === 'string') {
        return first.url;
      }
    } else if (typeof first === 'string' && first.trim()) {
      return first.trim();
    }
  }

  // Additional fallbacks from standard product mapping
  if (product.images?.thumbnail && typeof product.images.thumbnail === 'string') {
    return product.images.thumbnail;
  }
  if (product.images?.primary && typeof product.images.primary === 'string') {
    return product.images.primary;
  }

  // 5. Existing project placeholder image
  return FALLBACK_PRODUCT_IMAGE;
}

export interface ProductPriceDisplay {
  hasPriceRange: boolean;
  displayedPrice: number;
  formattedSellingPrice: string;
  mrp?: number;
  formattedMrp?: string;
  showMrpStrike: boolean;
  currency: string;
}

/**
 * Product price logic:
 * - If product has active variants with different prices:
 *   - Find lowest variant sellingPrice.
 *   - Display: From ₹2,795.
 * - Otherwise:
 *   - Display product's sellingPrice.
 * - Display MRP with strikethrough only if:
 *   mrp > displayedPrice.
 * - Never show crossed-out price when MRP <= displayedPrice.
 * - Crucial: Never calculate or display a promotion-adjusted price! Product cards show normal product prices.
 */
export function getProductDisplayPrice(product?: any): ProductPriceDisplay {
  const currency = String(product?.currency || product?.pricing?.currency || 'INR');

  // Check active variants
  const rawVariants = Array.isArray(product?.variants) ? product.variants : [];
  const activeVariants = rawVariants.filter((v: any) => {
    if (!v) return false;
    if (v.status !== undefined && v.status !== 'ACTIVE' && v.status !== 'Active') return false;
    if (v.isActive !== undefined && !v.isActive) return false;
    return true;
  });

  const variantPrices: number[] = [];
  for (const v of activeVariants) {
    const price = Number(v?.pricing?.sellingPrice ?? v?.sellingPrice ?? v?.price);
    if (Number.isFinite(price) && price > 0) {
      variantPrices.push(price);
    }
  }

  const uniquePrices = Array.from(new Set(variantPrices));
  const hasDifferentVariantPrices = uniquePrices.length > 1;

  let displayedPrice: number;
  let hasPriceRange = false;

  if (hasDifferentVariantPrices) {
    displayedPrice = Math.min(...variantPrices);
    hasPriceRange = true;
  } else if (uniquePrices.length === 1) {
    displayedPrice = uniquePrices[0];
  } else {
    displayedPrice = Number(product?.pricing?.sellingPrice ?? product?.sellingPrice ?? product?.price ?? 0);
  }

  // MRP
  const mrpRaw = Number(product?.pricing?.mrp ?? product?.mrp ?? product?.originalPrice ?? 0);
  const mrp = Number.isFinite(mrpRaw) && mrpRaw > 0 ? mrpRaw : undefined;

  // Strikethrough ONLY if mrp > displayedPrice
  const showMrpStrike = Boolean(mrp && mrp > displayedPrice);

  const formattedPrice = formatCurrency(displayedPrice, currency);
  const formattedSellingPrice = hasPriceRange ? `From ${formattedPrice}` : formattedPrice;
  const formattedMrp = mrp ? formatCurrency(mrp, currency) : undefined;

  return {
    hasPriceRange,
    displayedPrice,
    formattedSellingPrice,
    mrp,
    formattedMrp,
    showMrpStrike,
    currency,
  };
}

export interface ApplicableChip extends StorePromotionRef {
  href: string | null;
}

export interface ApplicableGroup {
  label: string;
  kind: 'products' | 'categories' | 'collections' | 'all';
  items: ApplicableChip[];
}

export function getApplicableGroups(promotion: StorePromotion): ApplicableGroup[] {
  const { applicableTo, categories = [], collections = [], products = [] } = promotion;
  const groups: ApplicableGroup[] = [];

  const catItems = categories.length > 0 ? categories : applicableTo?.categories || [];
  if (catItems.length > 0) {
    groups.push({
      label: 'Applies to categories',
      kind: 'categories',
      items: catItems.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        href: `/category/${item.slug || item.id}`,
      })),
    });
  }

  const colItems = collections.length > 0 ? collections : applicableTo?.collections || [];
  if (colItems.length > 0) {
    groups.push({
      label: 'Applies to collections',
      kind: 'collections',
      items: colItems.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        href: `/collections/${item.slug || item.id}`,
      })),
    });
  }

  const prodItems = products.length > 0 ? products : applicableTo?.products || [];
  if (prodItems.length > 0) {
    groups.push({
      label: 'Applies to products',
      kind: 'products',
      items: prodItems.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        href: `/products/${item.slug || item.id}`,
      })),
    });
  }

  if (!groups.length) {
    groups.push({ label: 'Sitewide: all products', kind: 'all', items: [] });
  }
  return groups;
}

export function getCtaDestination(promotion: StorePromotion): string {
  const { applicableTo, categories = [], collections = [], products = [] } = promotion;

  if (applicableTo?.type === 'CATEGORIES' && categories.length > 0 && categories[0].slug) {
    return `/category/${categories[0].slug}`;
  }
  if (applicableTo?.type === 'COLLECTIONS' && collections.length > 0 && collections[0].slug) {
    return `/collections/${collections[0].slug}`;
  }
  if (applicableTo?.type === 'PRODUCTS' && products.length === 1 && products[0].slug) {
    return `/products/${products[0].slug}`;
  }

  return '/shop';
}
