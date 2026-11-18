import api from './api';
import { colorHex } from '../data/colorPalette';
import { mapStoreProduct, NO_COLOR } from './store';
import { firstNumber } from '../utils/number';
import type { CartItem, Product, ProductColor } from '../types';

// -----------------------------------------------------------------------------
// Customer cart endpoints (authenticated)
// GET /cart, DELETE /cart, POST /cart/items, PATCH /cart/items/{itemId},
// DELETE /cart/items/{itemId}, POST /cart/recalculate, POST /cart/validate
// -----------------------------------------------------------------------------

export interface AddCartItemPayload {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CartTotals {
  subtotal?: number;
  discount?: number;
  shipping?: number;
  tax?: number;
  total?: number;
}

export interface CartSnapshot {
  /** Server cart id (needed by POST /coupons/validate) */
  id?: string;
  items: CartItem[];
  totals: CartTotals;
}

export interface CartValidationResult {
  valid: boolean;
  issues: string[];
}

/** Resolves a product id to a full catalog product when the cart response doesn't populate it */
export type ProductLookup = (productId: string) => Product | undefined;

const DEFAULT_HEX = '#D9C9B4';

const unwrap = (response: any) => response?.data?.data ?? response?.data;

const num = firstNumber;

const mapCartItem = (raw: any, lookup?: ProductLookup): CartItem | null => {
  if (!raw) return null;

  const variant = typeof raw.variantId === 'object' && raw.variantId ? raw.variantId : raw.variant;
  const productRaw =
    (typeof raw.productId === 'object' && raw.productId) ||
    (typeof raw.product === 'object' && raw.product) ||
    (typeof variant?.productId === 'object' && variant.productId) ||
    null;
  const productId: string | undefined = productRaw
    ? productRaw.id || productRaw._id
    : raw.productId || raw.product || variant?.productId;
  if (!productId) return null;

  const unitPrice = num(
    raw.unitPrice,
    raw.price,
    raw.sellingPrice,
    raw.priceSnapshot?.sellingPrice,
    raw.pricing?.sellingPrice,
    variant?.pricing?.sellingPrice,
    productRaw?.pricing?.sellingPrice
  );

  const product: Product =
    (productRaw?.name && mapStoreProduct(productRaw)) ||
    lookup?.(productId) ||
    // Fall back to the snapshot fields the cart line may carry
    mapStoreProduct({
      _id: productId,
      name: raw.name || raw.productName || 'Product',
      sku: raw.sku || variant?.sku,
      images: raw.image ? [{ url: typeof raw.image === 'string' ? raw.image : (raw.image.url || ''), isPrimary: true }] : variant?.images || [],
      pricing: { sellingPrice: unitPrice ?? 0, mrp: num(raw.mrp, variant?.pricing?.mrp) },
    });

  const attrs = variant?.attributes || raw.attributes || raw.variantAttributes || {};
  const size: string = raw.size || attrs.size || '';
  const colorName: string | undefined = raw.color?.name || raw.color || attrs.color;
  const selectedColor: ProductColor =
    (colorName && product.colors.find(c => c.name.toLowerCase() === String(colorName).toLowerCase())) ||
    (colorName ? { name: String(colorName), hex: colorHex(String(colorName)) || DEFAULT_HEX } : NO_COLOR);

  return {
    id: raw.id || raw._id || raw.itemId,
    variantId: variant ? variant.id || variant._id : raw.variantId,
    product,
    selectedSize: size,
    selectedColor,
    quantity: num(raw.quantity, raw.qty) ?? 1,
    unitPrice,
  };
};

const mapCart = (data: any, lookup?: ProductLookup): CartSnapshot | null => {
  const cart = data?.cart || data;
  const rawItems = Array.isArray(cart) ? cart : (cart?.items || data?.items);
  if (!Array.isArray(rawItems)) return null;

  const t = cart?.totals || cart?.summary || cart?.pricing || cart || {};
  return {
    id: Array.isArray(cart) ? undefined : cart?._id || cart?.id,
    items: rawItems.map(item => mapCartItem(item, lookup)).filter(Boolean) as CartItem[],
    totals: {
      subtotal: num(t.subtotal, t.subTotal, t.itemsTotal),
      discount: num(t.discount, t.discountTotal, t.totalDiscount),
      shipping: num(t.shipping, t.shippingFee, t.shippingTotal),
      tax: num(t.tax, t.taxTotal),
      total: num(t.total, t.grandTotal),
    },
  };
};

/**
 * Mutations resolve to the updated cart when the backend echoes it back,
 * or `null` when it doesn't (callers should then re-fetch with getCart).
 *
 * All cart writes go through one queue so they reach the server one at a time: the backend
 * updates the cart in a MongoDB transaction and rejects concurrent writes with a 500
 * "Write conflict", which left prices uncalculated (₹0).
 */
let writeQueue: Promise<unknown> = Promise.resolve();

const serialized = <T,>(task: () => Promise<T>): Promise<T> => {
  const run = writeQueue.then(task, task);
  writeQueue = run.catch(() => undefined);
  return run;
};

const isWriteConflict = (error: any) =>
  error?.response?.status >= 500 && /write conflict|transient|WriteConflict/i.test(JSON.stringify(error?.response?.data || ''));

// Retry once after a short pause if the database still reports a write conflict
const withConflictRetry = async <T,>(task: () => Promise<T>): Promise<T> => {
  try {
    return await task();
  } catch (error) {
    if (!isWriteConflict(error)) throw error;
    await new Promise(resolve => setTimeout(resolve, 400));
    return task();
  }
};

const cartWrite = <T,>(task: () => Promise<T>) => serialized(() => withConflictRetry(task));

/** GET /cart — the customer's cart */
export const getCart = async (lookup?: ProductLookup): Promise<CartSnapshot> => {
  const response = await api.get('/cart');
  return mapCart(unwrap(response), lookup) || { items: [], totals: {} };
};

/** DELETE /cart — empty the cart */
export const clearCart = (): Promise<void> =>
  cartWrite(async () => {
    await api.delete('/cart');
  });

/** POST /cart/items — add an item */
export const addCartItem = async (
  payload: AddCartItemPayload,
  lookup?: ProductLookup,
  headers?: Record<string, string>
): Promise<CartSnapshot | null> => {
  const body: AddCartItemPayload = { productId: payload.productId, quantity: payload.quantity };
  if (payload.variantId) body.variantId = payload.variantId;
  const response = await cartWrite(() => api.post('/cart/items', body, headers ? { headers } : undefined));
  return mapCart(unwrap(response), lookup);
};

/** PATCH /cart/items/{itemId} — change an item's quantity */
export const updateCartItem = async (itemId: string, quantity: number, lookup?: ProductLookup): Promise<CartSnapshot | null> => {
  const response = await cartWrite(() => api.patch(`/cart/items/${itemId}`, { quantity }));
  return mapCart(unwrap(response), lookup);
};

/** DELETE /cart/items/{itemId} — remove an item */
export const removeCartItem = async (itemId: string, lookup?: ProductLookup): Promise<CartSnapshot | null> => {
  const response = await cartWrite(() => api.delete(`/cart/items/${itemId}`));
  return mapCart(unwrap(response), lookup);
};

/**
 * POST /cart/recalculate — refresh prices & totals against the current catalog.
 * Calls made while one is already running share that request instead of starting another.
 */
let recalcInFlight: Promise<any> | null = null;

export const recalculateCart = async (lookup?: ProductLookup): Promise<CartSnapshot | null> => {
  if (!recalcInFlight) {
    recalcInFlight = cartWrite(() => api.post('/cart/recalculate')).finally(() => {
      recalcInFlight = null;
    });
  }
  const response = await recalcInFlight;
  return mapCart(unwrap(response), lookup);
};

/** POST /cart/validate — check the cart is ready for checkout (stock, prices, availability) */
export const validateCart = async (): Promise<CartValidationResult> => {
  try {
    const response = await api.post('/cart/validate');
    const data = unwrap(response) || {};
    const rawIssues: any[] = data.issues || data.errors || data.problems || [];
    const issues = rawIssues.map(i => (typeof i === 'string' ? i : i?.message || JSON.stringify(i)));
    const valid = data.valid ?? data.isValid ?? data.ready ?? issues.length === 0;
    return { valid: !!valid, issues };
  } catch (error: any) {
    // A 4xx here means the cart failed validation; surface the backend's reasons
    if (error.response && error.response.status < 500) {
      const body = error.response.data || {};
      const details: any[] = body.error?.details || body.issues || body.errors || [];
      const issues = details.map(d => (typeof d === 'string' ? d : d?.message)).filter(Boolean);
      return { valid: false, issues: issues.length ? issues : [body.message || 'Your bag needs attention before checkout.'] };
    }
    throw error;
  }
};
