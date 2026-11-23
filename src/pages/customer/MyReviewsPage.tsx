import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquareText, Package } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useMyReviewsPage } from '../../hooks/useMyReviewsPage';
import { invalidateMyReviews } from '../../hooks/useMyReviews';
import { deleteMyReview } from '../../service/reviews';
import { toReviewApiError } from '../../service/reviewErrors';
import { MyReviewCard } from '../../components/reviews/MyReviewCard';
import { ReviewsUnavailable } from '../../components/reviews/ReviewsUnavailable';
import { ReviewImageLightbox } from '../../components/reviews/ReviewImageLightbox';
import { LazyReviewFormModal } from '../../components/reviews/LazyReviewFormModal';
import type { ReviewFormTarget } from '../../components/reviews/ReviewFormModal';
import type { CustomerReview, ReviewImage } from '../../types/reviews';

const PAGE_SIZE = 10;

/** Loading placeholder shaped like MyReviewCard (thumbnail, text, action bar) */
const MyReviewCardsSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-4 sm:space-y-5" role="status" aria-label="Loading your reviews">
    {[...Array(count)].map((_, idx) => (
      <div key={idx} className="bg-allura-card border border-allura-border rounded-2xl shadow-subtle overflow-hidden animate-pulse" aria-hidden="true">
        <div className="flex items-start gap-3.5 sm:gap-5 p-4 sm:p-6">
          <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-xl bg-stone-200 flex-shrink-0" />
          <div className="flex-1 space-y-2.5 pt-1">
            <div className="h-2.5 w-16 bg-stone-200 rounded" />
            <div className="h-4 w-3/4 bg-stone-300/80 rounded" />
            <div className="h-3 w-1/2 bg-stone-200 rounded" />
          </div>
        </div>
        <div className="px-4 sm:px-6 pb-5 space-y-2">
          <div className="h-3 w-full bg-stone-200 rounded" />
          <div className="h-3 w-5/6 bg-stone-200 rounded" />
        </div>
        <div className="h-[68px] bg-allura-bg/40 border-t border-allura-border/60" />
      </div>
    ))}
  </div>
);

const readPage = (value: string | null): number => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : 1;
};

/** /account/reviews: the signed-in customer's own reviews (any status). Lazy-loaded route. */
const MyReviewsPage: React.FC = () => {
  const { showToast } = useShop();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = readPage(searchParams.get('page'));
  const data = useMyReviewsPage(page, PAGE_SIZE);
  const { removeLocal, reload } = data;

  const [formTarget, setFormTarget] = useState<ReviewFormTarget | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ images: ReviewImage[]; index: number } | null>(null);

  const goToPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams);
      if (next <= 1) params.delete('page');
      else params.set('page', String(next));
      setSearchParams(params);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [searchParams, setSearchParams]
  );

  const totalPages = data.pagination?.totalPages ?? 1;
  const total = data.pagination?.total ?? 0;

  // A page number past the end (e.g. after deletes or an old link) snaps to the last page
  useEffect(() => {
    if (data.status === 'ready' && page > 1 && page > totalPages) {
      const params = new URLSearchParams(searchParams);
      if (totalPages <= 1) params.delete('page');
      else params.set('page', String(totalPages));
      setSearchParams(params, { replace: true });
    }
  }, [data.status, page, totalPages, searchParams, setSearchParams]);

  const onEdit = useCallback((review: CustomerReview) => {
    setFormTarget({
      mode: 'edit',
      review,
      product: { name: review.productName, image: review.productImage },
    });
  }, []);

  const onDelete = useCallback(
    async (review: CustomerReview) => {
      const ok = await confirm({
        title: 'Delete your review?',
        message: `This permanently removes your review${review.productName ? ` of ${review.productName}` : ''} and its photos. This cannot be undone.`,
        confirmLabel: 'Delete',
        isDestructive: true,
      });
      if (!ok) return;
      setDeletingId(review.id);
      try {
        const result = await deleteMyReview(review.id);
        removeLocal(review.id);
        invalidateMyReviews();
        showToast(result.message, 'success');
        // Pull the next item onto this page if more pages follow
        if (page < totalPages) reload();
      } catch (error) {
        showToast(toReviewApiError(error, 'delete', 'Could not delete your review.').message, 'error');
      } finally {
        setDeletingId(null);
      }
    },
    [confirm, removeLocal, showToast, page, totalPages, reload]
  );

  const onOpenImage = useCallback((images: ReviewImage[], index: number) => setLightbox({ images, index }), []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-14 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="border-b border-allura-border/60 pb-5 sm:pb-6 space-y-3">
        <Link to="/account" className="inline-flex items-center gap-1 min-h-11 -ml-1 px-1 text-xs font-sans text-allura-muted hover:text-allura-text transition-colors">
          <ArrowLeft size={13} />
          <span>Back to Account</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-allura-bgSecondary text-allura-goldDark border border-allura-border flex items-center justify-center flex-shrink-0">
            <MessageSquareText size={20} />
          </span>
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-4xl text-allura-text font-normal leading-tight">My Reviews</h1>
            <p className="text-xs font-sans text-allura-muted mt-0.5">
              Reviews you've written. You can edit or delete them at any time.
            </p>
          </div>
        </div>
      </div>

      <div aria-live="polite" aria-busy={data.status === 'loading'}>
        {data.status === 'loading' ? (
          <MyReviewCardsSkeleton count={3} />
        ) : data.status === 'error' ? (
          // 401 is handled by the existing session flow (ProtectedRoute redirects once signed out)
          <ReviewsUnavailable message={data.error?.message} onRetry={reload} />
        ) : data.reviews.length === 0 && total === 0 ? (
          <div className="bg-allura-card border border-allura-border rounded-2xl p-10 sm:p-12 text-center space-y-4 shadow-subtle">
            <div className="w-14 h-14 rounded-full bg-allura-bgSecondary text-allura-goldDark flex items-center justify-center mx-auto border border-allura-border">
              <MessageSquareText size={26} />
            </div>
            <h2 className="font-serif text-xl text-allura-text">You haven't reviewed anything yet</h2>
            <p className="text-xs font-sans text-allura-muted max-w-sm mx-auto">
              Once an order is delivered, you can review each piece from its order page.
            </p>
            <Link
              to="/account/orders"
              className="inline-flex items-center gap-2 min-h-11 px-6 bg-allura-darkBrown hover:bg-allura-softBrown text-white text-xs font-sans font-bold tracking-wider uppercase rounded-xl transition-colors shadow-sm"
            >
              <Package size={14} />
              <span>Go to My Orders</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-sans">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-allura-bgSecondary border border-allura-border text-allura-darkBrown font-bold">
                {total} {total === 1 ? 'review' : 'reviews'}
              </span>
              {totalPages > 1 && (
                <span className="text-allura-muted">
                  Page {Math.min(page, totalPages)} of {totalPages}
                </span>
              )}
            </div>
            {data.reviews.map(review => (
              <MyReviewCard
                key={review.id}
                review={review}
                isDeleting={deletingId === review.id}
                onEdit={onEdit}
                onDelete={onDelete}
                onOpenImage={onOpenImage}
              />
            ))}

            {totalPages > 1 && (
              <nav className="flex items-center justify-between gap-3 pt-2" aria-label="My reviews pages">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1.5 min-h-11 px-4 border border-allura-border bg-allura-card rounded-xl text-xs font-sans font-bold text-allura-darkBrown hover:bg-allura-bg/60 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>
                <span className="text-xs font-sans text-allura-muted tabular-nums">
                  {Math.min(page, totalPages)} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1.5 min-h-11 px-4 border border-allura-border bg-allura-card rounded-xl text-xs font-sans font-bold text-allura-darkBrown hover:bg-allura-bg/60 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>

      {lightbox && <ReviewImageLightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}

      <LazyReviewFormModal target={formTarget} onClose={() => setFormTarget(null)} onSaved={reload} />
    </div>
  );
};

export default MyReviewsPage;
