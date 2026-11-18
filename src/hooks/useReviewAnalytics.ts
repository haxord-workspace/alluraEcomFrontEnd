import { useCallback, useEffect, useState } from 'react';
import { getReviewAnalytics } from '../service/adminReviews';
import { isReviewRequestAborted, toReviewApiError } from '../service/reviewErrors';
import type { ReviewAnalytics, ReviewAnalyticsParams, ReviewApiError } from '../types/reviews';

/**
 * GET /admin/product-reviews/analytics for a date range. A range change aborts the
 * stale request; loading / error are derived from the request key.
 */
export const useReviewAnalytics = ({ from, to }: ReviewAnalyticsParams) => {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([from ?? null, to ?? null, attempt]);
  const [result, setResult] = useState<{ key: string; data: ReviewAnalytics } | null>(null);
  const [error, setError] = useState<{ key: string; error: ReviewApiError } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getReviewAnalytics({ from, to }, { signal: controller.signal })
      .then(data => setResult({ key, data }))
      .catch(err => {
        if (isReviewRequestAborted(err)) return;
        setError({ key, error: toReviewApiError(err, 'admin-read', 'Could not load review analytics.') });
      });
    return () => controller.abort();
  }, [from, to, key]);

  const current = result?.key === key ? result.data : null;
  const currentError = error?.key === key ? error.error : null;

  return {
    status: (current ? 'ready' : currentError ? 'error' : 'loading') as 'loading' | 'ready' | 'error',
    data: current,
    error: currentError,
    reload: useCallback(() => setAttempt(a => a + 1), []),
  };
};
