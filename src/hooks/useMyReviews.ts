import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useShop } from '../context/ShopContext';
import { REVIEWS_ENABLED, REVIEW_LIMITS } from '../config/reviews';
import { getMyReviews } from '../service/reviews';
import { isReviewRequestAborted, toReviewApiError } from '../service/reviewErrors';
import type { CustomerReview } from '../types/reviews';

// -----------------------------------------------------------------------------
// Module-level cache of GET /customer/reviews (not in ShopContext).
// - Loaded once per signed-in customer, shared by every consumer (no per-item calls).
// - Requests limit=100; if the backend clamps it, the remaining pages are fetched
//   using the response's pagination (capped at MAX_PAGES as a safety net).
// - invalidate() reloads after a create / edit / delete.
// -----------------------------------------------------------------------------

const MAX_PAGES = 20;

type Status = 'idle' | 'loading' | 'ready' | 'error';

interface MyReviewsSnapshot {
  ownerKey: string | null;
  status: Status;
  reviews: CustomerReview[];
  byProduct: ReadonlyMap<string, CustomerReview>;
  byId: ReadonlyMap<string, CustomerReview>;
  /**
   * False when the list has reviews but none carries a readable productId
   * (backend gap): "already reviewed" can then only be detected by the 409.
   */
  canMatchByProduct: boolean;
  errorMessage: string;
}

const EMPTY: MyReviewsSnapshot = {
  ownerKey: null,
  status: 'idle',
  reviews: [],
  byProduct: new Map(),
  byId: new Map(),
  canMatchByProduct: true,
  errorMessage: '',
};

let snapshot: MyReviewsSnapshot = EMPTY;
let controller: AbortController | null = null;
const listeners = new Set<() => void>();

const setSnapshot = (next: MyReviewsSnapshot) => {
  snapshot = next;
  listeners.forEach(listener => listener());
};

const buildSnapshot = (ownerKey: string, reviews: CustomerReview[]): MyReviewsSnapshot => {
  const byProduct = new Map<string, CustomerReview>();
  const byId = new Map<string, CustomerReview>();
  reviews.forEach(review => {
    byId.set(review.id, review);
    // One review per product (backend 409); keep the first if duplicates ever appear
    if (review.productId && !byProduct.has(review.productId)) byProduct.set(review.productId, review);
  });
  return {
    ownerKey,
    status: 'ready',
    reviews,
    byProduct,
    byId,
    canMatchByProduct: reviews.length === 0 || byProduct.size > 0,
    errorMessage: '',
  };
};

const fetchAll = async (signal: AbortSignal): Promise<CustomerReview[]> => {
  const first = await getMyReviews({ page: 1, limit: REVIEW_LIMITS.myReviewsPageSize }, { signal });
  const all = [...first.reviews];
  const totalPages = Math.min(first.pagination.totalPages, MAX_PAGES);
  const limit = first.pagination.limit || REVIEW_LIMITS.myReviewsPageSize;
  for (let page = 2; page <= totalPages; page++) {
    const next = await getMyReviews({ page, limit }, { signal });
    if (next.reviews.length === 0) break;
    all.push(...next.reviews);
  }
  const seen = new Set<string>();
  return all.filter(review => (seen.has(review.id) ? false : (seen.add(review.id), true)));
};

const load = (ownerKey: string) => {
  controller?.abort();
  const current = new AbortController();
  controller = current;
  // Keep showing the previous data for the same customer while it reloads
  setSnapshot(
    snapshot.ownerKey === ownerKey
      ? { ...snapshot, status: snapshot.status === 'ready' ? 'ready' : 'loading' }
      : { ...EMPTY, ownerKey, status: 'loading' }
  );

  fetchAll(current.signal)
    .then(reviews => {
      if (controller !== current) return;
      setSnapshot(buildSnapshot(ownerKey, reviews));
    })
    .catch(error => {
      if (controller !== current || isReviewRequestAborted(error)) return;
      setSnapshot({
        ...snapshot,
        ownerKey,
        status: 'error',
        errorMessage: toReviewApiError(error, 'read', 'Could not load your reviews.').message,
      });
    })
    .finally(() => {
      if (controller === current) controller = null;
    });
};

const reset = () => {
  controller?.abort();
  controller = null;
  if (snapshot !== EMPTY) setSnapshot(EMPTY);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Reload the cache (call after creating, editing or deleting a review). */
export const invalidateMyReviews = () => {
  if (snapshot.ownerKey) load(snapshot.ownerKey);
};

export interface UseMyReviewsResult extends MyReviewsSnapshot {
  /** True once the first load finished (ready or error) for the current customer */
  isSettled: boolean;
  invalidate: () => void;
}

/**
 * The signed-in customer's own reviews. Inactive (no request) when the module is
 * off or nobody is signed in. Consumers mount after the host page's main content,
 * so the request never delays that page's first render.
 */
export const useMyReviews = (): UseMyReviewsResult => {
  const { isAuthenticated, customer } = useShop();
  const ownerKey = REVIEWS_ENABLED && isAuthenticated ? customer?.id || 'signed-in' : null;
  const state = useSyncExternalStore(subscribe, () => snapshot, () => EMPTY);

  useEffect(() => {
    if (!ownerKey) {
      if (snapshot.ownerKey) reset();
      return;
    }
    if (snapshot.ownerKey !== ownerKey || snapshot.status === 'idle') load(ownerKey);
  }, [ownerKey]);

  const invalidate = useCallback(() => invalidateMyReviews(), []);
  const current = state.ownerKey === ownerKey ? state : EMPTY;

  return {
    ...current,
    isSettled: current.status === 'ready' || current.status === 'error',
    invalidate,
  };
};
