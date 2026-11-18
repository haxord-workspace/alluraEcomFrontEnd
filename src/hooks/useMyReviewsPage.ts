import { useCallback, useEffect, useState } from 'react';
import { getMyReviews } from '../service/reviews';
import { isReviewRequestAborted, toReviewApiError } from '../service/reviewErrors';
import type { CustomerReview, ReviewApiError, ReviewPagination } from '../types/reviews';

interface PageResult {
  key: string;
  reviews: CustomerReview[];
  pagination: ReviewPagination;
}

/**
 * One server-side page of GET /customer/reviews for the My Reviews page.
 * Changing the page aborts the stale request. Status is derived from the request
 * key, so the empty state can never flash while a page is loading.
 */
export const useMyReviewsPage = (page: number, limit: number) => {
  const [attempt, setAttempt] = useState(0);
  const key = `${page}|${limit}|${attempt}`;
  const [result, setResult] = useState<PageResult | null>(null);
  const [error, setError] = useState<{ key: string; error: ReviewApiError } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getMyReviews({ page, limit }, { signal: controller.signal })
      .then(data => setResult({ key, ...data }))
      .catch(err => {
        if (isReviewRequestAborted(err)) return;
        setError({ key, error: toReviewApiError(err, 'read', 'Could not load your reviews.') });
      });
    return () => controller.abort();
  }, [page, limit, key]);

  const current = result?.key === key ? result : null;
  const currentError = error?.key === key ? error.error : null;
  const status: 'loading' | 'ready' | 'error' = current ? 'ready' : currentError ? 'error' : 'loading';

  /** Drop a deleted review from the current page and adjust the totals */
  const removeLocal = useCallback((reviewId: string) => {
    setResult(prev => {
      if (!prev || !prev.reviews.some(r => r.id === reviewId)) return prev;
      const total = Math.max(0, prev.pagination.total - 1);
      const limitValue = prev.pagination.limit || 1;
      return {
        ...prev,
        reviews: prev.reviews.filter(r => r.id !== reviewId),
        pagination: { ...prev.pagination, total, totalPages: Math.max(1, Math.ceil(total / limitValue)) },
      };
    });
  }, []);

  const reload = useCallback(() => setAttempt(a => a + 1), []);

  return {
    status,
    reviews: current?.reviews ?? [],
    pagination: current?.pagination ?? null,
    error: currentError,
    removeLocal,
    reload,
  };
};
