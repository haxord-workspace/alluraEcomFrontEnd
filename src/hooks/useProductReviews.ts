import { useCallback, useEffect, useRef, useState } from 'react';
import { getProductReviews, getProductReviewSummary } from '../service/reviews';
import { isReviewRequestAborted, toReviewApiError } from '../service/reviewErrors';
import { getCachedReviewSummary, setReviewSummary } from './useReviewSummaryStore';
import type {
  PublicReview,
  ReviewPagination,
  ReviewRating,
  ReviewSort,
  ReviewSummary,
} from '../types/reviews';

export const PRODUCT_REVIEWS_PAGE_SIZE = 10;

export interface ProductReviewFilters {
  sort: ReviewSort;
  rating?: ReviewRating;
  hasImages: boolean;
}

type LoadStatus = 'loading' | 'ready' | 'error';

interface ListResult {
  key: string;
  reviews: PublicReview[];
  pagination: ReviewPagination;
}

/**
 * Data for the Product Details reviews section: summary + filtered, paginated list.
 *
 * Every result is tagged with the request key it answers, and loading / error states
 * are derived from that key during render. Changing a filter therefore shows the
 * loading state immediately, the stale request is aborted, and a late response for
 * an old key can never overwrite the current one. "Load more" appends the next page.
 */
export const useProductReviews = (productId: string, filters: ProductReviewFilters) => {
  // ── Summary ──
  const [summaryAttempt, setSummaryAttempt] = useState(0);
  const summaryKey = `${productId}|${summaryAttempt}`;
  const [summaryResult, setSummaryResult] = useState<{ key: string; data: ReviewSummary } | null>(null);
  const [summaryErrorKey, setSummaryErrorKey] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getProductReviewSummary(productId, { signal: controller.signal })
      .then(data => {
        setReviewSummary(productId, data);
        setSummaryResult({ key: summaryKey, data });
      })
      .catch(error => {
        if (!isReviewRequestAborted(error)) setSummaryErrorKey(summaryKey);
      });
    return () => controller.abort();
  }, [productId, summaryKey]);

  const summary = summaryResult?.data ?? getCachedReviewSummary(productId);
  const summaryStatus: LoadStatus =
    summaryErrorKey === summaryKey ? 'error' : summaryResult?.key === summaryKey || summary ? 'ready' : 'loading';

  // ── List (page 1 on any filter change) ──
  const { sort, rating, hasImages } = filters;
  const [listAttempt, setListAttempt] = useState(0);
  const listKey = JSON.stringify([productId, sort, rating ?? null, hasImages, listAttempt]);
  const [listResult, setListResult] = useState<ListResult | null>(null);
  const [listError, setListError] = useState<{ key: string; message: string } | null>(null);
  const [loadingMoreKey, setLoadingMoreKey] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<{ key: string; message: string } | null>(null);
  const loadMoreController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    loadMoreController.current?.abort();

    getProductReviews(
      productId,
      { page: 1, limit: PRODUCT_REVIEWS_PAGE_SIZE, sort, rating, hasImages },
      { signal: controller.signal }
    )
      .then(result => setListResult({ key: listKey, ...result }))
      .catch(error => {
        if (isReviewRequestAborted(error)) return;
        setListError({ key: listKey, message: toReviewApiError(error, 'read', 'Reviews are unavailable right now.').message });
      });

    return () => controller.abort();
  }, [productId, sort, rating, hasImages, listKey]);

  // Abort any in-flight "load more" on unmount
  useEffect(() => () => loadMoreController.current?.abort(), []);

  const current = listResult?.key === listKey ? listResult : null;
  const listStatus: LoadStatus = current ? 'ready' : listError?.key === listKey ? 'error' : 'loading';
  const pagination = current?.pagination ?? null;
  const isLoadingMore = loadingMoreKey === listKey;
  const hasMore = !!pagination && pagination.page < pagination.totalPages;

  const loadMore = useCallback(() => {
    if (!current || isLoadingMore || current.pagination.page >= current.pagination.totalPages) return;
    const key = current.key;
    const controller = new AbortController();
    loadMoreController.current?.abort();
    loadMoreController.current = controller;
    setLoadingMoreKey(key);
    setLoadMoreError(null);

    getProductReviews(
      productId,
      {
        page: current.pagination.page + 1,
        limit: current.pagination.limit || PRODUCT_REVIEWS_PAGE_SIZE,
        sort,
        rating,
        hasImages,
      },
      { signal: controller.signal }
    )
      .then(result => {
        setListResult(prev => {
          if (!prev || prev.key !== key) return prev;
          const seen = new Set(prev.reviews.map(r => r.id));
          return {
            key,
            reviews: [...prev.reviews, ...result.reviews.filter(r => !seen.has(r.id))],
            pagination: result.pagination,
          };
        });
      })
      .catch(error => {
        if (isReviewRequestAborted(error)) return;
        setLoadMoreError({ key, message: toReviewApiError(error, 'read', 'Could not load more reviews.').message });
      })
      .finally(() => {
        if (loadMoreController.current === controller) {
          loadMoreController.current = null;
          setLoadingMoreKey(k => (k === key ? null : k));
        }
      });
  }, [productId, current, isLoadingMore, sort, rating, hasImages]);

  const retrySummary = useCallback(() => setSummaryAttempt(a => a + 1), []);
  const retryList = useCallback(() => setListAttempt(a => a + 1), []);

  return {
    summary,
    summaryStatus,
    retrySummary,
    reviews: current?.reviews ?? [],
    pagination,
    listStatus,
    listError: listError?.key === listKey ? listError.message : '',
    retryList,
    hasMore,
    loadMore,
    isLoadingMore,
    loadMoreError: loadMoreError?.key === listKey ? loadMoreError.message : '',
  };
};
