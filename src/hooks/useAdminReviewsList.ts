import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminReviews } from '../service/adminReviews';
import { isReviewRequestAborted, toReviewApiError } from '../service/reviewErrors';
import { nextReviewSeq, useReviewEntityStore } from './useReviewEntityStore';
import type { Stamped } from './useReviewEntityStore';
import type { AdminReview, AdminReviewListParams, ReviewApiError, ReviewPagination } from '../types/reviews';

// -----------------------------------------------------------------------------
// Single source of truth for the admin reviews page (table, cards and drawer):
// the stamped list page + the shared stamped entity store (details and writes).
// See useReviewEntityStore for the ordering rules.
// -----------------------------------------------------------------------------

export { nextReviewSeq };

interface ListResult {
  key: string;
  at: number;
  reviews: AdminReview[];
  pagination: ReviewPagination;
}

export type AdminReviewsListParams = Required<Pick<AdminReviewListParams, 'page' | 'limit'>> & AdminReviewListParams;

export const useAdminReviewsList = (params: AdminReviewsListParams) => {
  const [attempt, setAttempt] = useState(0);
  const { page, limit, status, productId, rating } = params;
  const key = JSON.stringify([page, limit, status ?? null, productId ?? null, rating ?? null, attempt]);
  const [result, setResult] = useState<ListResult | null>(null);
  const [error, setError] = useState<{ key: string; error: ReviewApiError } | null>(null);
  const store = useReviewEntityStore();
  const { resolve } = store;

  useEffect(() => {
    const controller = new AbortController();
    const at = nextReviewSeq();
    getAdminReviews({ page, limit, status, productId, rating }, { signal: controller.signal })
      .then(data => setResult({ key, at, ...data }))
      .catch(err => {
        if (isReviewRequestAborted(err)) return;
        setError({ key, error: toReviewApiError(err, 'admin-read', 'Could not load reviews.') });
      });
    return () => controller.abort();
  }, [page, limit, status, productId, rating, key]);

  const current = result?.key === key ? result : null;
  const currentError = error?.key === key ? error.error : null;

  // Rows as displayed: resolved, minus rows that no longer match the status filter
  const { rows, removedCount } = useMemo(() => {
    if (!current) return { rows: [] as AdminReview[], removedCount: 0 };
    const visible: AdminReview[] = [];
    let removed = 0;
    current.reviews.forEach(row => {
      const view = resolve(row.id, row, current.at) ?? row;
      if (status && view.status !== status) removed += 1;
      else visible.push(view);
    });
    return { rows: visible, removedCount: removed };
  }, [current, resolve, status]);

  const pagination = current
    ? { ...current.pagination, total: Math.max(0, current.pagination.total - removedCount) }
    : null;

  /** Find a review by id in the current page (with its fetch stamp) */
  const findRow = useCallback(
    (id: string): Stamped<AdminReview> | undefined => {
      const row = current?.reviews.find(r => r.id === id);
      return row && current ? { at: current.at, value: row } : undefined;
    },
    [current]
  );

  return {
    status: (current ? 'ready' : currentError ? 'error' : 'loading') as 'loading' | 'ready' | 'error',
    reviews: rows,
    /** Rows on this page that left the current status filter after moderation */
    removedCount,
    pagination,
    error: currentError,
    reload: useCallback(() => setAttempt(a => a + 1), []),
    findRow,
    ...store,
  };
};
