import api from './api';
import { mapStoreProduct } from './store';
import type { Product } from '../types';

// -----------------------------------------------------------------------------
// Customer wishlist endpoints (authenticated)
// GET /wishlist, DELETE /wishlist, POST /wishlist/items, DELETE /wishlist/items,
// GET /wishlist/check, POST /wishlist/check-many
// -----------------------------------------------------------------------------

export interface WishlistItemPayload {
  productId: string;
  variantId?: string;
}

export interface WishlistEntry {
  productId: string;
  variantId?: string;
  // Present when the backend populates the product on GET /wishlist
  product?: Product;
  addedAt?: string;
}

const unwrap = (response: any) => response?.data?.data ?? response?.data;

// Normalizes a single wishlist item. `productId` may be a bare id or a populated product.
const mapWishlistEntry = (raw: any): WishlistEntry | null => {
  if (!raw) return null;
  if (typeof raw === 'string') return { productId: raw };

  const productRaw =
    (typeof raw.productId === 'object' && raw.productId) ||
    (typeof raw.product === 'object' && raw.product) ||
    null;
  const productId = productRaw ? productRaw.id || productRaw._id : raw.productId || raw.product;
  if (!productId) return null;

  return {
    productId,
    variantId: typeof raw.variantId === 'object' ? raw.variantId?._id : raw.variantId,
    product: productRaw?.name ? mapStoreProduct(productRaw) : undefined,
    addedAt: raw.addedAt || raw.createdAt,
  };
};

const extractEntries = (data: any): WishlistEntry[] => {
  const items = Array.isArray(data) ? data : data?.items || data?.wishlist?.items || [];
  return items.map(mapWishlistEntry).filter(Boolean) as WishlistEntry[];
};

/** GET /wishlist — the customer's wishlist */
export const getWishlist = async (): Promise<WishlistEntry[]> => {
  const response = await api.get('/wishlist');
  return extractEntries(unwrap(response));
};

/** DELETE /wishlist — clear the customer's wishlist */
export const clearWishlist = async (): Promise<void> => {
  await api.delete('/wishlist');
};

/** POST /wishlist/items — add an item */
export const addWishlistItem = async (payload: WishlistItemPayload): Promise<WishlistEntry[]> => {
  const response = await api.post('/wishlist/items', payload);
  return extractEntries(unwrap(response));
};

/** DELETE /wishlist/items — remove an item */
export const removeWishlistItem = async (payload: WishlistItemPayload): Promise<WishlistEntry[]> => {
  const response = await api.delete('/wishlist/items', { data: payload });
  return extractEntries(unwrap(response));
};

/** GET /wishlist/check — whether a single item is wishlisted */
export const checkWishlistItem = async (payload: WishlistItemPayload): Promise<boolean> => {
  const response = await api.get('/wishlist/check', { params: payload });
  const data = unwrap(response);
  return typeof data === 'boolean' ? data : !!(data?.isWishlisted ?? data?.wishlisted ?? data?.exists);
};

/** POST /wishlist/check-many — map of productId -> wishlisted */
export const checkManyWishlistItems = async (productIds: string[]): Promise<Record<string, boolean>> => {
  if (productIds.length === 0) return {};
  const response = await api.post('/wishlist/check-many', { productIds });
  const data = unwrap(response);

  // Accept either { [id]: boolean }, { items: [{ productId, isWishlisted }] } or [{ productId, isWishlisted }]
  const list: any[] | null = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : null;
  if (list) {
    return list.reduce<Record<string, boolean>>((acc, item: any) => {
      const id = item.productId || item.id;
      if (id) acc[id] = !!(item.isWishlisted ?? item.wishlisted ?? item.exists);
      return acc;
    }, {});
  }
  return data && typeof data === 'object' ? data : {};
};
