// -----------------------------------------------------------------------------
// Promotion Display Options Utility
// Controls which elements appear on the storefront promotion banner.
// -----------------------------------------------------------------------------

export const DISPLAY_KEYS = [
  'name',
  'discount',
  'time_text',
  'time_counting',
  'shopnow_button',
  'limitedOffer_badge',
] as const;

export type PromotionDisplayKey = (typeof DISPLAY_KEYS)[number];

export interface PromotionDisplayOptionItem {
  key: PromotionDisplayKey | string;
  enabled: boolean;
}

export const DISPLAY_LABELS: Record<PromotionDisplayKey, string> = {
  name: 'Title',
  discount: 'Discount',
  time_text: 'End-date text',
  time_counting: 'Countdown timer',
  shopnow_button: 'Shop now button',
  limitedOffer_badge: 'Limited offer badge',
};

/**
 * Converts an API displayOptions array into a key -> boolean lookup map.
 * Missing keys default to true (safe default).
 */
export const toDisplayOptionsMap = (
  arr?: { key: string; enabled: boolean }[] | null
): Record<PromotionDisplayKey, boolean> =>
  Object.fromEntries(
    DISPLAY_KEYS.map((k) => [k, arr?.find((o) => o.key === k)?.enabled ?? true])
  ) as Record<PromotionDisplayKey, boolean>;

/**
 * Converts a key -> boolean lookup map back into the API array of exactly six items.
 */
export const toDisplayOptionsArray = (
  map: Record<PromotionDisplayKey, boolean>
): { key: PromotionDisplayKey; enabled: boolean }[] =>
  DISPLAY_KEYS.map((key) => ({ key, enabled: !!map[key] }));
