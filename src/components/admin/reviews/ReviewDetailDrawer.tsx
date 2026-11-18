import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Flag, Loader2, ThumbsUp, X } from 'lucide-react';
import { useModalA11y } from '../../../hooks/useModalA11y';
import { nextReviewSeq } from '../../../hooks/useAdminReviewsList';
import { getAdminReview } from '../../../service/adminReviews';
import { isReviewRequestAborted, toReviewApiError } from '../../../service/reviewErrors';
import { StatusBadge } from '../../common/StatusBadge';
import { StarRatingDisplay } from '../../reviews/StarRating';
import { ReviewImageLightbox } from '../../reviews/ReviewImageLightbox';
import { formatReviewDateTime } from '../../../utils/reviewFormat';
import { REVIEW_STATUS_LABELS } from '../../../types/reviews';
import type { AdminReview, ReviewApiError } from '../../../types/reviews';

interface ReviewDetailDrawerProps {
  /** Which review is open; null = closed */
  reviewId: string | null;
  /**
   * The review to show, already resolved by the page's single source of truth
   * (list row + detail snapshots + local writes). Undefined while only the id is
   * known (e.g. opened from a report without an embedded review): a loading shell
   * is shown and no actions are offered until the detail arrives.
   */
  review: AdminReview | undefined;
  onClose: () => void;
  /** Detail fetched from GET /admin/product-reviews/{id}; `at` = stamp taken when the request started */
  onDetailLoaded: (review: AdminReview, at: number) => void;
  /** Bump to re-fetch the detail (e.g. after moderation, to pick up history) */
  refreshToken?: number;
  /** Action area (Moderate / Respond) */
  renderActions: (review: AdminReview) => React.ReactNode;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-1.5">{children}</h3>
);

/**
 * Admin review detail. Shows the resolved review immediately and loads the full
 * record from GET /admin/product-reviews/{id} into the page's store. If that
 * request fails, the list data stays visible with a notice. Every section renders
 * only when the data exists.
 */
export const ReviewDetailDrawer: React.FC<ReviewDetailDrawerProps> = ({
  reviewId,
  review,
  onClose,
  onDetailLoaded,
  refreshToken = 0,
  renderActions,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ key: string; error: ReviewApiError } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Stays active under the lightbox / modals: useModalA11y ignores keys while focus is in a stacked dialog
  useModalA11y(!!reviewId, panelRef, onClose);

  const requestKey = `${reviewId}|${attempt}|${refreshToken}`;

  useEffect(() => {
    if (!reviewId) return;
    const controller = new AbortController();
    const at = nextReviewSeq();
    getAdminReview(reviewId, { signal: controller.signal })
      .then(detail => {
        onDetailLoaded(detail, at);
        setLoadedKey(requestKey);
      })
      .catch(error => {
        if (isReviewRequestAborted(error)) return;
        setFailure({ key: requestKey, error: toReviewApiError(error, 'admin-read', 'Could not load full details.') });
      });
    return () => controller.abort();
  }, [reviewId, requestKey, onDetailLoaded]);

  if (!reviewId) return null;

  const loadError = loadedKey !== requestKey && failure?.key === requestKey ? failure.error : null;
  const isLoading = loadedKey !== requestKey && !loadError;

  // Only the id is known so far: loading shell / error, no actions
  if (!review) {
    return (
      <div className="fixed inset-0 z-[60] flex justify-end">
        <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] animate-fade-in" onClick={onClose} aria-hidden="true" />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="relative h-full w-full sm:max-w-xl bg-white border-l border-stone-200 shadow-2xl flex flex-col animate-fade-in focus:outline-none"
        >
          <div className="px-5 py-4 border-b border-stone-200 flex items-start justify-between gap-3">
            <h2 id={titleId} className="font-serif text-xl text-stone-900 font-normal">
              Review detail
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 w-11 h-11 flex items-center justify-center rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex-shrink-0"
              aria-label="Close review detail"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 px-5 py-6 text-xs font-sans">
            {loadError ? (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start justify-between gap-3">
                <span>{loadError.message}</span>
                {loadError.kind !== 'forbidden' && (
                  <button type="button" onClick={() => setAttempt(a => a + 1)} className="font-bold underline flex-shrink-0">
                    Retry
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 animate-pulse" role="status" aria-label="Loading review">
                <div className="h-5 w-2/3 bg-stone-200 rounded" />
                <div className="h-3 w-1/3 bg-stone-100 rounded" />
                <div className="h-3 w-full bg-stone-100 rounded" />
                <div className="h-3 w-5/6 bg-stone-100 rounded" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[1px] animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative h-full w-full sm:max-w-xl bg-white border-l border-stone-200 shadow-2xl flex flex-col animate-fade-in focus:outline-none"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">Review detail</span>
            <h2 id={titleId} className="font-serif text-xl text-stone-900 font-normal break-words">
              {review.title || 'Untitled review'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-sans text-stone-500">
              <StatusBadge status={REVIEW_STATUS_LABELS[review.status]} size="sm" />
              <StarRatingDisplay rating={review.rating} size={13} />
              {review.createdAt && <span>{formatReviewDateTime(review.createdAt)}</span>}
              {isLoading && (
                <span className="inline-flex items-center gap-1 text-stone-400">
                  <Loader2 size={12} className="animate-spin" /> Loading details…
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 w-11 h-11 flex items-center justify-center rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-100 flex-shrink-0"
            aria-label="Close review detail"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 text-xs font-sans text-stone-700">
          {loadError && (
            <div role="alert" className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex items-start justify-between gap-3">
              <span>
                {loadError.kind === 'forbidden' ? loadError.message : "Couldn't load the full record. Showing the list data."}
              </span>
              {loadError.kind !== 'forbidden' && (
                <button type="button" onClick={() => setAttempt(a => a + 1)} className="font-bold underline flex-shrink-0">
                  Retry
                </button>
              )}
            </div>
          )}

          {/* Badges */}
          {/* Only chips that carry information (the API sends helpfulCount / reportCount 0 on every review) */}
          {(review.isVerifiedPurchase || (review.helpfulCount ?? 0) > 0 || review.isReported) && (
            <div className="flex flex-wrap gap-2">
              {review.isVerifiedPurchase && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                  <BadgeCheck size={12} /> Verified purchase
                </span>
              )}
              {(review.helpfulCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200 text-[10px] font-bold">
                  <ThumbsUp size={12} /> {review.helpfulCount} helpful
                </span>
              )}
              {review.isReported && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
                  <Flag size={12} /> Reported{review.reportCount !== undefined ? ` (${review.reportCount})` : ''}
                </span>
              )}
            </div>
          )}

          {/* Review text */}
          <section>
            <SectionTitle>Review</SectionTitle>
            {review.comment ? (
              <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-line break-words">{review.comment}</p>
            ) : (
              <p className="text-stone-400">No comment.</p>
            )}
          </section>

          {review.images.length > 0 && (
            <section>
              <SectionTitle>Photos ({review.images.length})</SectionTitle>
              <ul className="flex flex-wrap gap-2">
                {review.images.map((img, idx) => (
                  <li key={`${img.url}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(idx)}
                      className="block w-20 h-20 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-stone-800"
                      aria-label={`Open photo ${idx + 1} of ${review.images.length}`}
                    >
                      <img src={img.thumbnailUrl} alt={img.alt || `Review photo ${idx + 1}`} loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Product / customer / order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <section>
              <SectionTitle>Product</SectionTitle>
              <div className="flex items-center gap-2.5">
                {review.product.image && (
                  <img src={review.product.image} alt="" className="w-10 h-12 rounded-lg object-cover bg-stone-100 flex-shrink-0" />
                )}
                <div className="min-w-0">
                  <p className={`font-medium break-words ${review.product.name ? 'text-stone-900' : 'text-stone-400 italic'}`}>
                    {review.product.name || 'Unknown product'}
                  </p>
                  {review.product.id && (
                    <Link to={`/admin/products/${encodeURIComponent(review.product.id)}/edit`} className="text-[11px] font-bold text-allura-goldDark hover:underline">
                      Open product
                    </Link>
                  )}
                </div>
              </div>
            </section>

            <section>
              <SectionTitle>Customer</SectionTitle>
              <p className={`font-medium break-words ${review.customer.name ? 'text-stone-900' : 'text-stone-400 italic'}`}>
                {review.customer.name || (review.customer.id ? `Customer #${review.customer.id.slice(-6)}` : 'Unknown customer')}
              </p>
              {review.customer.email && <p className="text-stone-500 break-all">{review.customer.email}</p>}
              {review.customer.id && (
                <Link to={`/admin/customers/${encodeURIComponent(review.customer.id)}`} className="text-[11px] font-bold text-allura-goldDark hover:underline">
                  Open customer
                </Link>
              )}
            </section>

            {(review.order.id || review.order.number) && (
              <section>
                <SectionTitle>Order</SectionTitle>
                <p className="font-mono text-stone-900">{review.order.number || `#${review.order.id?.slice(-8).toUpperCase()}`}</p>
                {review.order.id && (
                  <Link to={`/admin/orders/${encodeURIComponent(review.order.id)}`} className="text-[11px] font-bold text-allura-goldDark hover:underline">
                    Open order
                  </Link>
                )}
              </section>
            )}
          </div>

          {/* Only meaningful while rejected; an old reason is not shown after re-approval */}
          {review.status === 'REJECTED' && review.rejectionReason && (
            <section>
              <SectionTitle>Rejection reason</SectionTitle>
              <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 whitespace-pre-line break-words">{review.rejectionReason}</p>
            </section>
          )}

          {review.adminResponse && (
            <section>
              <SectionTitle>Seller response</SectionTitle>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                <p className="text-stone-800 whitespace-pre-line break-words">{review.adminResponse.message}</p>
                {review.adminResponse.respondedAt && (
                  <p className="text-[10px] text-stone-400">{formatReviewDateTime(review.adminResponse.respondedAt)}</p>
                )}
              </div>
            </section>
          )}

          {review.history.length > 0 && (
            <section>
              <SectionTitle>Moderation history</SectionTitle>
              <ol className="border-l-2 border-stone-200 pl-4 space-y-3">
                {review.history.map((entry, idx) => (
                  <li key={idx} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-stone-300 border-2 border-white" aria-hidden="true" />
                    <p className="font-semibold text-stone-900">{entry.action ? prettyAction(entry.action) : 'Update'}</p>
                    <p className="text-[11px] text-stone-500">
                      {[entry.actorName, formatReviewDateTime(entry.at)].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {entry.note && <p className="text-stone-700 mt-0.5 whitespace-pre-line break-words">{entry.note}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-stone-200 bg-stone-50/60">{renderActions(review)}</div>
      </div>

      {lightboxIndex !== null && (
        <ReviewImageLightbox images={review.images} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
};

const prettyAction = (action: string) =>
  action
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, c => c.toUpperCase());
