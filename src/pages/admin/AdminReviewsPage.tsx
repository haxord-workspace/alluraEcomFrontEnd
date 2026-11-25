import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Flag, Package, RefreshCw, ShieldCheck, Download, Trash2, Loader2 } from 'lucide-react';
import { useConfirm } from '../../context/ConfirmContext';
import { useShop } from '../../context/ShopContext';
import { AdminPagination } from '../../components/admin/AdminPagination';
import { AdminErrorBanner } from '../../components/admin/AdminErrorBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { StarRatingDisplay } from '../../components/reviews/StarRating';
import { ReviewProductFilter } from '../../components/admin/reviews/ReviewProductFilter';
import { useAdminReviewsList } from '../../hooks/useAdminReviewsList';
import { useReviewModeration } from '../../hooks/useReviewModeration';
import { useAdminReviewLookups } from '../../hooks/useAdminReviewLookups';
import { canModerateReview as canModerate } from '../../service/reviewMappers';
import {
  getAdminReviews,
  deleteAdminReview,
  exportAdminReviewsCsv,
} from '../../service/adminReviews';
import { formatReviewDate } from '../../utils/reviewFormat';
import { REVIEW_RATINGS, REVIEW_STATUSES, REVIEW_STATUS_LABELS } from '../../types/reviews';
import type { AdminReview, ReviewRating, ReviewStatus } from '../../types/reviews';
import { usePermissions } from '../../hooks/usePermissions';
import { REVIEWS_ADMIN_MODULE } from '../../config/reviews';

const PAGE_SIZES = [10, 20, 50] as const;
const DEFAULT_LIMIT = 20;

// ── URL query string ⇄ filters (only the params the API supports) ───────────

interface Filters {
  page: number;
  limit: number;
  status?: ReviewStatus;
  productId?: string;
  rating?: ReviewRating;
}

const readFilters = (params: URLSearchParams): Filters => {
  const page = Number(params.get('page'));
  const limit = Number(params.get('limit'));
  const status = params.get('status')?.toUpperCase();
  const rating = Number(params.get('rating'));
  const productId = params.get('productId')?.trim();
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: (PAGE_SIZES as readonly number[]).includes(limit) ? limit : DEFAULT_LIMIT,
    status: (REVIEW_STATUSES as readonly string[]).includes(status || '') ? (status as ReviewStatus) : undefined,
    productId: productId || undefined,
    rating: (REVIEW_RATINGS as readonly number[]).includes(rating) ? (rating as ReviewRating) : undefined,
  };
};

const forbiddenMessage = "You don't have permission to view reviews.";

/** One cheap probe (status=PENDING, limit=1) on mount: are there legacy pending reviews? */
const useHasPendingReviews = (): boolean => {
  const [hasPending, setHasPending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    getAdminReviews({ status: 'PENDING', page: 1, limit: 1 }, { signal: controller.signal })
      .then(result => setHasPending(result.pagination.total > 0 || result.reviews.length > 0))
      .catch(() => {
        // Probe failure just hides the chip; the main list reports its own errors
      });
    return () => controller.abort();
  }, []);
  return hasPending;
};

/** Admin › Reviews: moderation list. Lazy-loaded route. */
const AdminReviewsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const list = useAdminReviewsList(filters);
  const { findRow, reload } = list;

  // The API returns productId / customerId as bare ids: fill names from existing admin services
  const lookups = useAdminReviewLookups();
  const { enrich, request } = lookups;
  const rows = useMemo(() => list.reviews.map(enrich), [list.reviews, enrich]);
  useEffect(() => {
    request(list.reviews);
  }, [list.reviews, request]);

  // Reviews are public on submit, so "Pending" only matters for legacy data: show that
  // chip only while pending reviews exist (or the URL already filters by it).
  const hasLegacyPending = useHasPendingReviews();
  const statusChips: Array<ReviewStatus | undefined> = [
    undefined,
    'APPROVED',
    'HIDDEN',
    'REJECTED',
    ...(hasLegacyPending || filters.status === 'PENDING' ? (['PENDING'] as const) : []),
  ];

  // Drawer + Moderate / Respond modals (shared with the Reports page)
  const moderation = useReviewModeration({ store: list, findRow, onStale: reload, lookups });
  const { openDrawer, openModerate } = moderation;

  // Moderation emptied this page (rows left the status filter): step back, or pull the next items
  const pageEmptiedByModeration = list.status === 'ready' && list.reviews.length === 0 && list.removedCount > 0;
  useEffect(() => {
    if (!pageEmptiedByModeration) return;
    if (filters.page > 1) {
      const next = new URLSearchParams(searchParams);
      next.set('page', String(filters.page - 1));
      if (next.get('page') === '1') next.delete('page');
      setSearchParams(next, { replace: true });
    } else {
      reload();
    }
  }, [pageEmptiedByModeration, filters.page, searchParams, setSearchParams, reload]);

  /** Any filter change resets to page 1; only `page` itself keeps the others */
  const update = useCallback(
    (changes: Partial<Record<keyof Filters, string | number | undefined>>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      });
      if (!('page' in changes)) next.delete('page');
      if (next.get('page') === '1') next.delete('page');
      if (next.get('limit') === String(DEFAULT_LIMIT)) next.delete('limit');
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const hasFilters = !!(filters.status || filters.productId || filters.rating);
  const clearFilters = () => {
    const next = new URLSearchParams(searchParams);
    ['status', 'productId', 'rating', 'page'].forEach(key => next.delete(key));
    setSearchParams(next);
  };

  // Show the "Reported" column only when the response carries report info
  // The API sends reportCount: 0 on every row, so only show the column when a row on this page is actually reported
  const showReported = list.reviews.some(r => r.isReported === true || (r.reportCount ?? 0) > 0);
  const total = list.pagination?.total ?? 0;
  const isForbidden = list.error?.kind === 'forbidden';
  const { can } = usePermissions();
  const confirm = useConfirm();
  const { showToast } = useShop();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const blob = await exportAdminReviewsCsv({
        status: filters.status,
        productId: filters.productId,
        rating: filters.rating,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `allura-reviews-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Reviews exported (capped at 10,000 rows).', 'gold');
    } catch (err: any) {
      showToast(err?.message || 'Could not export reviews.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteReview = async (review: AdminReview) => {
    const ok = await confirm({
      title: 'Delete review permanently?',
      message: `Are you sure you want to permanently delete this review from ${review.customer.name || 'this customer'}? This action cannot be undone.`,
      confirmLabel: 'Delete review',
      isDestructive: true,
    });
    if (!ok) return;

    try {
      await deleteAdminReview(review.id);
      showToast('Review permanently deleted.', 'success');
      reload();
    } catch (err: any) {
      showToast(err?.message || 'Failed to delete review.', 'error');
    }
  };

  const onOpen = useCallback(
    (review: AdminReview) => {
      const row = findRow(review.id);
      openDrawer(review.id, row?.value ?? review, row?.at ?? 0);
    },
    [findRow, openDrawer]
  );
  const onModerate = useCallback((review: AdminReview) => openModerate(review.id), [openModerate]);

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-[10px] font-sans font-bold tracking-[0.2em] text-allura-goldDark uppercase">
            Customer voice & moderation
          </span>
          <h1 className="font-serif text-3xl text-stone-900 font-normal mt-0.5">
            Product Reviews{list.status === 'ready' ? ` (${total})` : ''}
          </h1>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {can('reviews', 'export') && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
              title="Export reviews CSV (max 10,000 rows)"
            >
              {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Export CSV</span>
            </button>
          )}
          <button
            type="button"
            onClick={list.reload}
            disabled={list.status === 'loading'}
            className="inline-flex items-center gap-1.5 min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
          >
            <RefreshCw size={14} className={list.status === 'loading' ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter by status">
          {statusChips.map(status => {
            const active = filters.status === status;
            return (
              <button
                key={status ?? 'ALL'}
                type="button"
                onClick={() => update({ status })}
                aria-pressed={active}
                className={`min-h-10 px-4 rounded-full text-xs font-sans font-semibold whitespace-nowrap transition-colors ${active ? 'bg-[#561C08] text-white shadow-xs' : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                  }`}
              >
                {status ? REVIEW_STATUS_LABELS[status] : 'All'}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 text-xs font-sans">
          <ReviewProductFilter productId={filters.productId} onChange={productId => update({ productId })} />

          <label className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase text-stone-400">Rating</span>
            <select
              value={filters.rating ?? ''}
              onChange={e => update({ rating: e.target.value ? Number(e.target.value) : undefined })}
              className="min-h-10 px-3 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:border-stone-800"
            >
              <option value="">All ratings</option>
              {REVIEW_RATINGS.map(star => (
                <option key={star} value={star}>
                  {star} star{star === 1 ? '' : 's'}
                </option>
              ))}
            </select>
          </label>

          {hasFilters && (
            <button type="button" onClick={clearFilters} className="self-start sm:self-auto min-h-10 font-bold text-allura-goldDark underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {list.status === 'error' && (
        <div className="space-y-2">
          <AdminErrorBanner
            title={isForbidden ? 'Access denied' : 'Could not load reviews'}
            error={isForbidden ? forbiddenMessage : list.error?.message}
          />
          {!isForbidden && (
            <button type="button" onClick={list.reload} className="min-h-10 px-4 rounded-xl border border-stone-200 bg-white text-xs font-sans font-bold text-stone-700 hover:bg-stone-50">
              Retry
            </button>
          )}
        </div>
      )}

      {list.status !== 'error' && (
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xs">
          {list.status === 'loading' ? (
            <ListSkeleton />
          ) : list.reviews.length === 0 ? (
            <div className="p-10 text-center text-stone-400 text-xs font-sans space-y-2">
              <p>{hasFilters ? 'No reviews match these filters.' : 'No reviews yet.'}</p>
              {hasFilters && (
                <button type="button" onClick={clearFilters} className="font-bold text-allura-goldDark underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[10px]">
                      <th className="p-4">Product</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4 w-[30%]">Review</th>
                      <th className="p-4">Status</th>
                      {showReported && <th className="p-4">Reported</th>}
                      <th className="p-4">Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {rows.map(review => (
                      <ReviewRow
                        key={review.id}
                        review={review}
                        showReported={showReported}
                        onOpen={onOpen}
                        onModerate={onModerate}
                        onDelete={handleDeleteReview}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="md:hidden divide-y divide-stone-100">
                {rows.map(review => (
                  <ReviewMobileCard
                    key={review.id}
                    review={review}
                    onOpen={onOpen}
                    onModerate={onModerate}
                    onDelete={handleDeleteReview}
                  />
                ))}
              </ul>
            </>
          )}

          {list.status === 'ready' && total > 0 && (
            <div className="border-t border-stone-200">
              <AdminPagination
                currentPage={filters.page}
                totalItems={total}
                pageSize={filters.limit}
                onPageChange={page => update({ page })}
                className="border-t-0"
              />
              <div className="flex items-center justify-end gap-2 px-4 pb-3 text-xs font-sans text-stone-500">
                <label htmlFor="admin-reviews-page-size">Rows per page</label>
                <select
                  id="admin-reviews-page-size"
                  value={filters.limit}
                  onChange={e => update({ limit: Number(e.target.value) })}
                  className="min-h-9 px-2 bg-white border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-stone-800"
                >
                  {PAGE_SIZES.map(size => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {moderation.layer}
    </div>
  );
};

// ── Row actions (View / Moderate) ────────────────────────────────────────────
// 'table': compact, one line, icon-only on medium screens (labels from xl up).
// 'card':  mobile, full-width buttons with large tap targets.
type ActionLayout = 'table' | 'card';

const ACTION_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#561C08]/40 focus-visible:ring-offset-1';
const ACTION_SIZE: Record<ActionLayout, string> = {
  table: 'h-8 min-w-8 px-2 xl:px-3 text-[11px]',
  card: 'flex-1 min-h-11 px-4 text-xs',
};
const ACTION_LABEL: Record<ActionLayout, string> = {
  table: 'hidden xl:inline',
  card: '',
};

interface RowProps {
  review: AdminReview;
  onOpen: (review: AdminReview) => void;
  onModerate: (review: AdminReview) => void;
  onDelete?: (review: AdminReview) => void;
}

const ReviewActions: React.FC<RowProps & { layout: ActionLayout }> = ({
  review,
  onOpen,
  onModerate,
  onDelete,
  layout,
}) => {
  const { can } = usePermissions();
  const canPublish = can(REVIEWS_ADMIN_MODULE, 'publish');
  const canEdit = can(REVIEWS_ADMIN_MODULE, 'edit');
  const canDelete = can(REVIEWS_ADMIN_MODULE, 'delete');
  const canModerateAction = canPublish || canEdit;
  const titleSuffix = review.title ? ` "${review.title}"` : '';
  return (
    <div className={layout === 'table' ? 'inline-flex flex-nowrap items-center justify-end gap-1.5' : 'flex items-stretch gap-2'}>
      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onOpen(review);
        }}
        className={`${ACTION_BASE} ${ACTION_SIZE[layout]} border border-stone-200 bg-white text-stone-700 hover:border-[#561C08]/40 hover:bg-[#561C08]/5 hover:text-[#561C08]`}
        aria-label={`View review${titleSuffix}`}
        title="View review"
      >
        <Eye size={14} className="shrink-0" />
        <span className={ACTION_LABEL[layout]}>View</span>
      </button>
      {canModerateAction && canModerate(review) && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onModerate(review);
          }}
          className={`${ACTION_BASE} ${ACTION_SIZE[layout]} bg-[#561C08] text-white shadow-xs hover:bg-[#561C08]/90 active:bg-[#561C08]/80`}
          aria-label={`Moderate review${titleSuffix}`}
          title="Moderate review"
        >
          <ShieldCheck size={14} className="shrink-0" />
          <span className={ACTION_LABEL[layout]}>Moderate</span>
        </button>
      )}
      {canDelete && onDelete && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onDelete(review);
          }}
          className={`${ACTION_BASE} ${ACTION_SIZE[layout]} border border-rose-200 bg-rose-50/70 text-rose-700 hover:bg-rose-100 active:bg-rose-200`}
          aria-label={`Delete review${titleSuffix}`}
          title="Delete review"
        >
          <Trash2 size={13} className="shrink-0 text-rose-600" />
          <span className={ACTION_LABEL[layout]}>Delete</span>
        </button>
      )}
    </div>
  );
};

// ── Rows ─────────────────────────────────────────────────────────────────────

const ProductCell: React.FC<{ review: AdminReview }> = ({ review }) => (
  <div className="flex items-center gap-2.5 min-w-0">
    {review.product.image ? (
      <img src={review.product.image} alt="" loading="lazy" className="w-9 h-11 rounded-lg object-cover bg-stone-100 flex-shrink-0" />
    ) : (
      <span className="w-9 h-11 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
        <Package size={14} className="text-stone-400" />
      </span>
    )}
    <span className={`line-clamp-2 break-words ${review.product.name ? 'text-stone-900 font-medium' : 'text-stone-400 italic'}`}>
      {review.product.name || 'Unknown product'}
    </span>
  </div>
);

const CustomerCell: React.FC<{ review: AdminReview }> = ({ review }) =>
  review.customer.name || review.customer.email ? (
    <div className="min-w-0 max-w-[180px]">
      {review.customer.name && <p className="text-stone-900 truncate">{review.customer.name}</p>}
      {review.customer.email && <p className="text-[10px] text-stone-400 truncate">{review.customer.email}</p>}
    </div>
  ) : (
    // Name not available (yet, or the lookup failed): show the real id, never a made-up name
    <span className="text-stone-400 italic">{review.customer.id ? `Customer #${review.customer.id.slice(-6)}` : 'Unknown customer'}</span>
  );

/** Up to 3 photo thumbnails (+N); the full set opens in the drawer's lightbox */
const ReviewThumbs: React.FC<{ review: AdminReview }> = ({ review }) => {
  if (review.images.length === 0) return null;
  const shown = review.images.slice(0, 3);
  const extra = review.images.length - shown.length;
  return (
    <div className="flex items-center gap-1.5 mt-1.5" aria-label={`${review.images.length} photo${review.images.length === 1 ? '' : 's'}`}>
      {shown.map((img, idx) => (
        <img
          key={`${img.url}-${idx}`}
          src={img.thumbnailUrl}
          alt={img.alt || `Review photo ${idx + 1}`}
          loading="lazy"
          decoding="async"
          className="w-10 h-10 rounded-lg object-cover border border-stone-200 bg-stone-100"
        />
      ))}
      {extra > 0 && <span className="text-[10px] font-bold text-stone-500">+{extra}</span>}
    </div>
  );
};

const ReportedFlag: React.FC<{ review: AdminReview }> = ({ review }) =>
  review.isReported ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold">
      <Flag size={11} />
      {review.reportCount !== undefined ? review.reportCount : 'Yes'}
    </span>
  ) : review.isReported === false ? (
    <span className="text-stone-400">—</span>
  ) : null;

const ReviewRow: React.FC<RowProps & { showReported: boolean }> = memo(
  ({ review, showReported, onOpen, onModerate, onDelete }) => (
    <tr className="hover:bg-stone-50/70 transition-colors cursor-pointer" onClick={() => onOpen(review)}>
      <td className="p-4 max-w-[220px]">
        <ProductCell review={review} />
      </td>
      <td className="p-4">
        <CustomerCell review={review} />
      </td>
      <td className="p-4">
        <StarRatingDisplay rating={review.rating} size={12} />
      </td>
      <td className="p-4">
        {review.title && <p className="font-semibold text-stone-900 line-clamp-1 break-words">{review.title}</p>}
        <p className="text-stone-500 line-clamp-2 break-words">{review.comment}</p>
        <ReviewThumbs review={review} />
      </td>
      <td className="p-4">
        <StatusBadge status={REVIEW_STATUS_LABELS[review.status]} size="sm" />
      </td>
      {showReported && (
        <td className="p-4">
          <ReportedFlag review={review} />
        </td>
      )}
      <td className="p-4 whitespace-nowrap text-stone-500">{formatReviewDate(review.createdAt) || '—'}</td>
      <td className="p-4 text-right whitespace-nowrap">
        <ReviewActions
          review={review}
          onOpen={onOpen}
          onModerate={onModerate}
          onDelete={onDelete}
          layout="table"
        />
      </td>
    </tr>
  )
);
ReviewRow.displayName = 'ReviewRow';

const ReviewMobileCard: React.FC<RowProps> = memo(({ review, onOpen, onModerate, onDelete }) => (
  <li className="text-xs font-sans">
    <button type="button" onClick={() => onOpen(review)} className="w-full text-left p-4 pb-2 space-y-2.5 hover:bg-stone-50/70">
      <div className="flex items-start justify-between gap-3">
        <ProductCell review={review} />
        <StatusBadge status={REVIEW_STATUS_LABELS[review.status]} size="sm" className="flex-shrink-0" />
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-stone-500">
        <StarRatingDisplay rating={review.rating} size={12} />
        <span className={review.customer.name || review.customer.email ? '' : 'italic text-stone-400'}>
          {review.customer.name || review.customer.email || (review.customer.id ? `Customer #${review.customer.id.slice(-6)}` : 'Unknown customer')}
        </span>
        {review.createdAt && <span>· {formatReviewDate(review.createdAt)}</span>}
        <ReportedFlag review={review} />
      </div>
      {review.title && <p className="font-semibold text-stone-900 line-clamp-1 break-words">{review.title}</p>}
      {review.comment && <p className="text-stone-500 line-clamp-2 break-words">{review.comment}</p>}
      <ReviewThumbs review={review} />
    </button>
    <div className="px-4 pb-4 pt-1">
      <ReviewActions
        review={review}
        onOpen={onOpen}
        onModerate={onModerate}
        onDelete={onDelete}
        layout="card"
      />
    </div>
  </li>
));
ReviewMobileCard.displayName = 'ReviewMobileCard';

const ListSkeleton: React.FC = () => (
  <div className="divide-y divide-stone-100" role="status" aria-label="Loading reviews">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="p-4 flex items-center gap-4 animate-pulse" aria-hidden="true">
        <div className="w-9 h-11 rounded-lg bg-stone-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 bg-stone-200 rounded" />
          <div className="h-3 w-2/3 bg-stone-100 rounded" />
        </div>
        <div className="hidden md:block h-5 w-20 bg-stone-100 rounded-full" />
      </div>
    ))}
  </div>
);

export default AdminReviewsPage;
