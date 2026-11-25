/**
 * Remembers what a guest was doing (Add to Bag / Buy Now) when they were sent to sign in,
 * so the action can be finished for them right after login, sign-up or Google sign-in.
 *
 * Kept in sessionStorage: it survives a refresh, the Google popup and moving between the
 * login / sign-up / forgot-password screens, but not a closed tab. Old entries expire so a
 * stale action is never replayed much later.
 *
 * Lifecycle: 'pending' (saved before the login redirect) -> 'processing' (claimed by the one
 * code path that runs it) -> removed once it has finished. A 'processing' entry found after a
 * refresh is never run again, so the item can't be added twice.
 */

import type { Product } from '../types';

export type PendingShopIntent = 'add_to_bag' | 'buy_now';

export interface PendingShopAction {
  /** Unique id of this action */
  id: string;
  action: PendingShopIntent;
  status: 'pending' | 'processing';
  productId: string;
  productSlug?: string;
  productName?: string;
  /** Variant chosen on the page (when the product's variants were loaded there) */
  variantId?: string;
  sku?: string;
  /** Size / colour labels; the catalogue has no separate ids for these */
  size: string;
  colorName: string;
  quantity: number;
  /** Page the customer was on (e.g. /product/anarkali-kurta), used to send them back if needed */
  returnUrl: string;
  createdAt: number;
  /**
   * The product as it was loaded on the page (incl. variants), so finishing the action after
   * sign-in doesn't have to re-fetch it (that request alone can take many seconds). Used only to
   * resolve the variant id; stock and price are always checked by the cart API (POST /cart/items).
   */
  product?: Product;
}

export type NewPendingShopAction = Omit<PendingShopAction, 'id' | 'status' | 'createdAt'>;

/** Passed as router state when sending the customer back to the product page, so their choice is kept */
export interface RestoreShopSelection {
  restoreSelection: { size: string; colorName: string; quantity: number };
}

const STORAGE_KEY = 'allura_pending_shop_action';
const MAX_AGE_MS = 30 * 60 * 1000;

/** Pages that are part of signing in; a pending action survives moving between these */
export const isAuthFlowPath = (pathname: string) =>
  pathname === '/auth' ||
  pathname.startsWith('/auth/') ||
  pathname === '/forgot-password' ||
  pathname === '/reset-password';

const newId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const write = (action: PendingShopAction) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action));
  } catch {
    // Storage unavailable (private mode / quota): the customer simply lands on the default page
  }
};

export const savePendingShopAction = (action: NewPendingShopAction) =>
  write({ ...action, id: newId(), status: 'pending', createdAt: Date.now() });

export const clearPendingShopAction = (id?: string) => {
  try {
    // With an id, only remove that action (a newer one may have replaced it meanwhile)
    if (id && readPendingShopAction()?.id !== id) return;
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
};

const str = (v: unknown) => (typeof v === 'string' ? v : undefined);

export const readPendingShopAction = (): PendingShopAction | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PendingShopAction>;
    const valid =
      (data.action === 'add_to_bag' || data.action === 'buy_now') &&
      typeof data.id === 'string' &&
      typeof data.productId === 'string' &&
      data.productId !== '' &&
      typeof data.createdAt === 'number' &&
      Date.now() - data.createdAt < MAX_AGE_MS;
    if (!valid) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      id: data.id!,
      action: data.action!,
      status: data.status === 'processing' ? 'processing' : 'pending',
      productId: data.productId!,
      productSlug: str(data.productSlug),
      productName: str(data.productName),
      variantId: str(data.variantId),
      sku: str(data.sku),
      size: str(data.size) ?? '',
      colorName: str(data.colorName) ?? '',
      quantity: Math.max(1, Math.floor(Number(data.quantity) || 1)),
      returnUrl: str(data.returnUrl)?.startsWith('/') ? data.returnUrl! : '/',
      createdAt: data.createdAt!,
      product:
        data.product && typeof data.product === 'object' && data.product.id === data.productId && Array.isArray(data.product.variants)
          ? data.product
          : undefined,
    };
  } catch {
    clearPendingShopAction();
    return null;
  }
};

/** Marks the action as being run, so a refresh / second sign-in callback can't run it again */
export const markPendingShopActionProcessing = (action: PendingShopAction) =>
  write({ ...action, status: 'processing' });

/** True while there is an action to finish (or one being finished) after sign-in */
export const hasPendingShopAction = () => readPendingShopAction() !== null;
