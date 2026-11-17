import { useEffect, useRef, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { checkoutErrorMessage, previewCheckout, type CheckoutSummary } from '../service/checkout';
import { computeOrderTotal } from '../utils/pricing';

export interface CartShippingPreviewOptions {
  /** Override address (e.g. selected address on CheckoutPage); defaults to customer's default shipping address */
  addressId?: string;
  /** Shipping method sent to POST /checkout/preview (default: 'STANDARD') */
  shippingMethod?: string;
  /** Partial checkout line IDs */
  cartItemIds?: string[];
  /** Skip calling POST /checkout/preview when the frontend threshold already qualifies for free shipping (default: true) */
  skipWhenFreeShipping?: boolean;
  /** Debounce delay in ms before issuing POST /checkout/preview (default: 0) */
  debounceMs?: number;
  /** Skip auto-fetching customer addresses when caller already manages them (default: false) */
  skipAddressFetch?: boolean;
  /** Keep last known-good summary if a subsequent preview request fails (default: false) */
  preserveSummaryOnError?: boolean;
}

/**
 * Resolves live shipping cost and order summary via POST /checkout/preview.
 * Used by CartDrawer, CartPage, and CheckoutPage.
 */
export const useCartShippingPreview = (
  enabled: boolean,
  options: CartShippingPreviewOptions = {}
) => {
  const {
    addressId: overrideAddressId,
    shippingMethod = 'STANDARD',
    cartItemIds,
    skipWhenFreeShipping = true,
    debounceMs = 0,
    skipAddressFetch = false,
    preserveSummaryOnError = false,
  } = options;

  const {
    cart,
    cartId,
    isCartLoading,
    cartSubtotal,
    freeShippingRemaining,
    appliedCoupon,
    couponDiscount,
    customer,
    fetchCustomerAddresses,
    isLoadingAddresses,
  } = useShop();

  const addressesCheckedRef = useRef(false);
  const [previewState, setPreviewState] = useState<{
    key: string;
    summary: CheckoutSummary | null;
    error: string | null;
  } | null>(null);

  const addresses = customer?.addresses || [];
  const defaultAddress = addresses.find(a => a.isDefaultShipping) || addresses[0];
  const effectiveAddressId = overrideAddressId ?? defaultAddress?.id;

  useEffect(() => {
    if (!customer) {
      addressesCheckedRef.current = false;
      return;
    }
    if (skipAddressFetch || overrideAddressId || !enabled || addresses.length > 0 || addressesCheckedRef.current) {
      return;
    }
    addressesCheckedRef.current = true;
    void fetchCustomerAddresses();
  }, [skipAddressFetch, overrideAddressId, enabled, customer, addresses.length, fetchCustomerAddresses]);

  const cartSignature = cart.map(i => `${i.id}:${i.quantity}`).join(',');
  const cartItemIdsKey = cartItemIds?.length ? cartItemIds.join(',') : '';
  const canPreview =
    enabled &&
    cart.length > 0 &&
    (!skipWhenFreeShipping || freeShippingRemaining > 0) &&
    Boolean(cartId) &&
    Boolean(effectiveAddressId);
  const previewKey = canPreview
    ? `${cartId}|${effectiveAddressId}|${shippingMethod}|${appliedCoupon?.code ?? ''}|${cartItemIdsKey}|${cartSignature}`
    : '';

  useEffect(() => {
    if (!previewKey || !cartId || !effectiveAddressId) return;

    let cancelled = false;
    const itemIds = cartItemIdsKey ? cartItemIdsKey.split(',') : undefined;
    const timer = setTimeout(async () => {
      try {
        const result = await previewCheckout({
          cartId,
          addressId: effectiveAddressId,
          couponCode: appliedCoupon?.code,
          shippingMethod,
          ...(itemIds ? { cartItemIds: itemIds } : {}),
        });
        if (!cancelled) {
          setPreviewState({ key: previewKey, summary: result, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          const rawMessage = checkoutErrorMessage(err, 'Could not calculate your order total.');
          const message =
            itemIds && /cartItemIds/i.test(rawMessage)
              ? "Removing items from checkout isn't available yet. Please add the items back, or remove them from your bag instead."
              : rawMessage;
          setPreviewState(prev => ({
            key: previewKey,
            summary: preserveSummaryOnError ? (prev?.summary ?? null) : null,
            error: message,
          }));
        }
      }
    }, debounceMs);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    previewKey,
    cartId,
    effectiveAddressId,
    shippingMethod,
    appliedCoupon?.code,
    cartItemIdsKey,
    debounceMs,
    preserveSummaryOnError,
  ]);

  const hasSettledCurrentKey = Boolean(previewKey) && previewState?.key === previewKey;
  const summary = previewKey
    ? hasSettledCurrentKey
      ? previewState!.summary
      : preserveSummaryOnError
        ? (previewState?.summary ?? null)
        : null
    : null;
  const previewError = previewKey && hasSettledCurrentKey ? previewState!.error : null;
  const isPreviewLoading = Boolean(previewKey) && !hasSettledCurrentKey;

  const resolvedShipping = summary
    ? summary.shippingAmount
    : skipWhenFreeShipping && freeShippingRemaining === 0
      ? 0
      : undefined;

  const isShippingLoading =
    Boolean(previewKey) &&
    resolvedShipping === undefined &&
    (isCartLoading || isLoadingAddresses || isPreviewLoading);

  const estimatedTotal = summary
    ? summary.total
    : computeOrderTotal(cartSubtotal, couponDiscount, resolvedShipping ?? 0);

  return { summary, previewError, resolvedShipping, isShippingLoading, estimatedTotal };
};
