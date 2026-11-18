import { useSyncExternalStore } from 'react';
import type { ReviewSummary } from '../types/reviews';

// -----------------------------------------------------------------------------
// Module-level store for product review summaries (not in ShopContext).
// The lazily-loaded reviews section publishes the summary it fetched; the rating
// line next to the product title subscribes so it shows the live average/count
// without making a request of its own.
// -----------------------------------------------------------------------------

const summaries = new Map<string, ReviewSummary>();
const listeners = new Set<() => void>();

const emit = () => listeners.forEach(listener => listener());

export const setReviewSummary = (productId: string, summary: ReviewSummary) => {
  summaries.set(productId, summary);
  emit();
};

export const getCachedReviewSummary = (productId: string): ReviewSummary | undefined =>
  summaries.get(productId);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useReviewSummary = (productId: string | undefined): ReviewSummary | undefined =>
  useSyncExternalStore(
    subscribe,
    () => (productId ? summaries.get(productId) : undefined),
    () => undefined
  );
