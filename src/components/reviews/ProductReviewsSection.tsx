import React, { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Star } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useProductReviews } from '../../hooks/useProductReviews';
import type { ProductReviewFilters } from '../../hooks/useProductReviews';
import { invalidateMyReviews, useMyReviews } from '../../hooks/useMyReviews';
import { deleteMyReview } from '../../service/reviews';
import { toReviewApiError } from '../../service/reviewErrors';
import { findReviewableOrderItem } from '../../utils/reviewEligibility';
import { LazyReviewFormModal } from './LazyReviewFormModal';
import type { ReviewFormTarget } from './ReviewFormModal';
import { MyReviewPanel, OwnReviewButtons } from './MyReviewPanel';
import { ReviewSummaryPanel } from './ReviewSummaryPanel';
import { ReviewCallToAction } from './ReviewCallToAction';
import { ReviewCard } from './ReviewCard';
import { ReviewCardsSkeleton, ProductReviewsSkeleton } from './ProductReviewsSkeleton';
import { ReviewsUnavailable } from './ReviewsUnavailable';
import { ReviewImageLightbox } from './ReviewImageLightbox';
import { ReportReviewModal } from './ReportReviewModal';
import { REVIEW_SORTS, REVIEW_SORT_LABELS } from '../../types/reviews';
import type { CustomerReview, ReviewApiError, ReviewImage, ReviewRating, ReviewSort } from '../../types/reviews';

interface ProductReviewsSectionProps {
  productId: string;
}

/**
 * Product Details reviews: summary, filters, list, helpful votes, reports.
 * Loaded lazily by LazyProductReviews (default export for React.lazy).
 */
const ProductReviewsSection: React.FC<ProductReviewsSectionProps> = ({ productId }) => {
  const { isAuthenticated, showToast, orders } = useShop();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();

  const [filters, setFilters] = useState<ProductReviewFilters>({ sort: 'newest', rating: undefined, hasImages: false });
  const data = useProductReviews(productId, filters);

  const [lightbox, setLightbox] = useState<{ images: ReviewImage[]; index: number } | null>(null);
  const [reportTarget, setReportTarget] = useState<string | null>(null);

  // ── The signed-in customer's own review + eligibility (data the app already has) ──
  const my = useMyReviews();
  const myReview = my.byProduct.get(productId);
  // ShopContext's already-loaded orders only; no extra request. Backend 403 stays the authority.
  const reviewable = useMemo(
    () => (isAuthenticated ? findReviewableOrderItem(orders, productId) : null),
    [isAuthenticated, orders, productId]
  );
  const [formTarget, setFormTarget] = useState<ReviewFormTarget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { retryList, retrySummary } = data;

  const refreshAfterChange = useCallback(() => {
    retryList();
    retrySummary();
  }, [retryList, retrySummary]);

  const openEdit = useCallback((review: CustomerReview) => setFormTarget({ mode: 'edit', review }), []);

  const removeReview = useCallback(
    async (review: CustomerReview) => {
      const ok = await confirm({
        title: 'Delete your review?',
        message: 'This permanently removes your review and its photos. This cannot be undone.',
        confirmLabel: 'Delete',
        isDestructive: true,
      });
      if (!ok) return;
      setDeletingId(review.id);
      try {
        const result = await deleteMyReview(review.id);
        showToast(result.message, 'success');
        invalidateMyReviews();
        refreshAfterChange();
      } catch (error) {
        const apiError = toReviewApiError(error, 'delete', 'Could not delete your review.');
        showToast(apiError.message, 'error');
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, showToast, refreshAfterChange]
  );

  const ctaSlot = myReview ? (
    <MyReviewPanel
      review={myReview}
      isDeleting={deletingId === myReview.id}
      onEdit={() => openEdit(myReview)}
      onDelete={() => void removeReview(myReview)}
    />
  ) : reviewable ? (
    <>
      <p className="text-allura-muted leading-relaxed">Your order of this piece has been delivered. Tell others what you think.</p>
      <button
        type="button"
        onClick={() =>
          setFormTarget({
            mode: 'create',
            productId,
            orderId: reviewable.order.id,
            variantId: reviewable.item.variantId,
            product: { name: reviewable.item.product.name, image: reviewable.item.product.images?.primary },
          })
        }
        className="w-full min-h-11 inline-flex items-center justify-center gap-2 bg-allura-darkBrown hover:bg-allura-darkBrown/90 text-white rounded-xl font-bold uppercase tracking-wider transition-colors"
      >
        <Star size={14} />
        <span>Write a Review</span>
      </button>
    </>
  ) : undefined;

  const setRating = useCallback((rating: ReviewRating | undefined) => setFilters(f => ({ ...f, rating })), []);
  const setSort = (sort: ReviewSort) => setFilters(f => ({ ...f, sort }));
  // const toggleImages = () => setFilters(f => ({ ...f, hasImages: !f.hasImages }));
  const isFiltered = filters.rating !== undefined || filters.hasImages;

  // Sign-in prompt for vote / report (uses the app's existing confirm dialog)
  const ensureSignedIn = useCallback(
    (purpose: 'vote' | 'report') => {
      if (isAuthenticated) return true;
      void confirm({
        title: 'Sign in to continue',
        message: purpose === 'vote' ? 'Please sign in to mark reviews as helpful.' : 'Please sign in to report a review.',
        confirmLabel: 'Sign in',
      }).then(ok => {
        if (ok) navigate('/auth/login', { state: { from: location } });
      });
      return false;
    },
    [isAuthenticated, confirm, navigate, location]
  );

  const handleAuthError = useCallback(
    (error: ReviewApiError) => {
      showToast(error.message, error.kind === 'unauthorized' ? 'info' : 'error');
      if (error.kind === 'unauthorized') navigate('/auth/login', { state: { from: location } });
    },
    [showToast, navigate, location]
  );

  const onVoteResult = useCallback(
    (result: { voted: boolean } | { error: ReviewApiError }) => {
      if ('error' in result) handleAuthError(result.error);
      else showToast(result.voted ? 'Thanks for your feedback!' : 'Your helpful vote was removed.', 'success');
    },
    [handleAuthError, showToast]
  );

  const onOpenImage = useCallback((images: ReviewImage[], index: number) => setLightbox({ images, index }), []);
  const onReport = useCallback((reviewId: string) => setReportTarget(reviewId), []);

  const initialLoading = data.summaryStatus === 'loading' && data.listStatus === 'loading' && !data.summary;
  const bothFailed = data.summaryStatus === 'error' && data.listStatus === 'error';
  const total = data.pagination?.total ?? 0;

  return (
    <section aria-labelledby="product-reviews-heading" className="mt-8 sm:mt-14 pt-8 sm:pt-12 border-t border-allura-border/60">
      <div className="mb-6 sm:mb-8">
        <span className="text-[11px] font-sans font-bold tracking-[0.25em] uppercase text-allura-goldDark block mb-1">
          IN THEIR WORDS
        </span>
        <h2 id="product-reviews-heading" className="font-serif text-2xl sm:text-3xl text-allura-text font-normal uppercase">
          Customer Reviews
        </h2>
      </div>

      {initialLoading ? (
        <ProductReviewsSkeleton />
      ) : bothFailed ? (
        <ReviewsUnavailable
          message="Reviews unavailable right now."
          onRetry={() => {
            data.retrySummary();
            data.retryList();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
          {/* Left: summary + CTA */}
          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24 lg:self-start">
            {data.summary ? (
              <ReviewSummaryPanel summary={data.summary} activeRating={filters.rating} onSelectRating={setRating} />
            ) : data.summaryStatus === 'error' ? (
              <ReviewsUnavailable compact message="Rating summary unavailable." onRetry={data.retrySummary} />
            ) : null}
            <ReviewCallToAction isAuthenticated={isAuthenticated} eligibleSlot={ctaSlot} />
          </aside>

          {/* Right: controls + list */}
          <div className="lg:col-span-8 space-y-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter reviews">
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-full">
                  <FilterChip active={filters.rating === undefined} onClick={() => setRating(undefined)} label="All" />
                  {REVIEW_RATINGS.map(star => (
                    <FilterChip
                      key={star}
                      active={filters.rating === star}
                      onClick={() => setRating(filters.rating === star ? undefined : star)}
                      label={`${star} ★`}
                      ariaLabel={`${star} star reviews`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={toggleImages}
                  aria-pressed={filters.hasImages}
                  className={`inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-xl border text-xs font-sans font-semibold transition-colors ${
                    filters.hasImages
                      ? 'bg-allura-darkBrown text-white border-allura-darkBrown'
                      : 'border-allura-border bg-allura-card text-allura-text hover:border-allura-gold'
                  }`}
                >
                  <Images size={14} />
                  <span>With photos</span>
                </button>
              </div> */}

              <label className="flex items-center gap-2 text-xs font-sans text-allura-muted">
                <span className="font-bold uppercase tracking-wider whitespace-nowrap">Sort</span>
                <select
                  value={filters.sort}
                  onChange={e => setSort(e.target.value as ReviewSort)}
                  className="min-h-11 flex-1 sm:flex-none px-3 bg-allura-card border border-allura-border rounded-xl text-allura-text font-semibold focus:outline-none focus:border-allura-gold"
                >
                  {REVIEW_SORTS.map(sort => (
                    <option key={sort} value={sort}>
                      {REVIEW_SORT_LABELS[sort]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div aria-live="polite" aria-busy={data.listStatus === 'loading'}>
              {data.listStatus === 'loading' ? (
                <ReviewCardsSkeleton count={2} />
              ) : data.listStatus === 'error' ? (
                <ReviewsUnavailable message={data.listError} onRetry={data.retryList} />
              ) : data.reviews.length === 0 ? (
                <div className="bg-allura-card border border-allura-border rounded-2xl p-8 text-center space-y-2">
                  <p className="font-serif text-lg text-allura-text">
                    {isFiltered ? 'No reviews match these filters' : 'No reviews yet'}
                  </p>
                  <p className="text-xs font-sans text-allura-muted">
                    {isFiltered ? 'Try another rating or clear the filters.' : 'Reviews from verified customers will appear here.'}
                  </p>
                  {isFiltered && (
                    <button
                      type="button"
                      onClick={() => setFilters(f => ({ ...f, rating: undefined, hasImages: false }))}
                      className="mt-2 min-h-11 px-4 border border-allura-border rounded-xl text-xs font-sans font-bold uppercase tracking-wider text-allura-darkBrown hover:bg-allura-bg/60"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[11px] font-sans text-allura-muted">
                    Showing {data.reviews.length} of {total}
                  </p>
                  {data.reviews.map(review => {
                    // Ownership by review id: works even when list items lack productId
                    const own = my.byId.get(review.id);
                    return (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        isOwn={!!own}
                        ensureSignedIn={ensureSignedIn}
                        onOpenImage={onOpenImage}
                        onReport={onReport}
                        onVoteResult={onVoteResult}
                        ownActions={
                          own ? (
                            <OwnReviewButtons
                              isDeleting={deletingId === own.id}
                              onEdit={() => openEdit(own)}
                              onDelete={() => void removeReview(own)}
                            />
                          ) : undefined
                        }
                      />
                    );
                  })}

                  {data.loadMoreError && <ReviewsUnavailable compact message={data.loadMoreError} onRetry={data.loadMore} />}

                  {data.hasMore && !data.loadMoreError && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={data.loadMore}
                        disabled={data.isLoadingMore}
                        className="inline-flex items-center justify-center gap-2 min-h-11 px-6 border-2 border-allura-darkBrown text-allura-darkBrown bg-allura-card hover:bg-allura-bg/40 rounded-xl text-xs font-sans font-bold uppercase tracking-[0.2em] disabled:opacity-60"
                      >
                        {data.isLoadingMore && <Loader2 size={14} className="animate-spin" />}
                        <span>{data.isLoadingMore ? 'Loading…' : 'Load more reviews'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <ReviewImageLightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}

      <LazyReviewFormModal target={formTarget} onClose={() => setFormTarget(null)} onSaved={refreshAfterChange} />

      <ReportReviewModal
        key={reportTarget ?? 'closed'}
        reviewId={reportTarget}
        onClose={() => setReportTarget(null)}
        onDone={result => {
          // `in` narrowing works with or without strictNullChecks (boolean-flag narrowing does not)
          if ('error' in result) handleAuthError(result.error);
          else showToast(result.message, 'success');
        }}
      />
    </section>
  );
};

// const FilterChip: React.FC<{ active: boolean; onClick: () => void; label: string; ariaLabel?: string }> = ({
//   active,
//   onClick,
//   label,
//   ariaLabel,
// }) => (
//   <button
//     type="button"
//     onClick={onClick}
//     aria-pressed={active}
//     aria-label={ariaLabel}
//     className={`min-h-11 min-w-11 px-3 rounded-xl border text-xs font-sans font-semibold whitespace-nowrap transition-colors ${active
//       ? 'bg-allura-darkBrown text-white border-allura-darkBrown'
//       : 'border-allura-border bg-allura-card text-allura-text hover:border-allura-gold'
//       }`}
//   >
//     {label}
//   </button>
// );

export default ProductReviewsSection;
