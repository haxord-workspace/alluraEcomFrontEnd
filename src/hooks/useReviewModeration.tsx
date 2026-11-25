import { useCallback, useEffect, useState } from 'react';
import type { AdminReviewLookups } from './useAdminReviewLookups';
import { MessageSquareReply, ShieldCheck } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { ReviewDetailDrawer } from '../components/admin/reviews/ReviewDetailDrawer';
import { ModerateReviewModal } from '../components/admin/reviews/ModerateReviewModal';
import { RespondReviewModal } from '../components/admin/reviews/RespondReviewModal';
import { usePermissions } from './usePermissions';
import { REVIEWS_ADMIN_MODULE } from '../config/reviews';
import { getAdminReview } from '../service/adminReviews';
import { ASSUMED_MODERATION_RESULT_STATUS, canModerateReview } from '../service/reviewMappers';
import { nextReviewSeq } from './useReviewEntityStore';
import type { ReviewEntityStore, Stamped } from './useReviewEntityStore';
import type { AdminReview, ModerationAction, ReviewSellerResponse } from '../types/reviews';

const MODERATED_TOAST: Record<ModerationAction, string> = {
  APPROVE: 'Review approved. It is now live on the product page.',
  REJECT: 'Review rejected.',
  HIDE: 'Review hidden from the product page.',
  RESTORE: 'Review restored.',
};

interface UseReviewModerationOptions {
  store: Pick<ReviewEntityStore, 'resolve' | 'recordDetail' | 'recordWrite'>;
  /** Look up a list row (with its fetch stamp), when the page has a review list */
  findRow?: (id: string) => Stamped<AdminReview> | undefined;
  /** Called when a re-fetch failed, so the page can reload its list */
  onStale?: () => void;
  /** Fills product / customer names the response left as bare ids (useAdminReviewLookups) */
  lookups?: AdminReviewLookups;
}

/**
 * The Phase F review detail drawer + Moderate / Respond modals, as one reusable
 * layer (Reviews page and Reports page). Every write goes through the page's
 * stamped store, so all views of a review stay in sync.
 */
export const useReviewModeration = ({ store, findRow, onStale, lookups }: UseReviewModerationOptions) => {
  const { showToast } = useShop();
  const { resolve, recordDetail, recordWrite } = store;

  // The drawer keeps the copy it was opened with, so it stays coherent if the row
  // leaves the current page / filter. `fallback` may be absent (only an id known).
  const [open, setOpen] = useState<{ id: string; fallback?: AdminReview; at: number } | null>(null);
  const [drawerRefresh, setDrawerRefresh] = useState(0);
  const [moderatingId, setModeratingId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const { can } = usePermissions();
  const canPublish = can(REVIEWS_ADMIN_MODULE, 'publish');
  const canEdit = can(REVIEWS_ADMIN_MODULE, 'edit');
  const canModerateAction = canPublish || canEdit;

  /** One review, resolved from the single source of truth (list row + details + writes) */
  const reviewById = useCallback(
    (id: string | null | undefined): AdminReview | undefined => {
      if (!id) return undefined;
      const row = findRow?.(id);
      if (row) return resolve(id, row.value, row.at);
      if (open?.id === id) return resolve(id, open.fallback, open.at);
      return resolve(id);
    },
    [findRow, resolve, open]
  );

  const refetchReview = useCallback(
    (id: string, fallbackToast: string) => {
      const at = nextReviewSeq();
      getAdminReview(id)
        .then(review => recordDetail(review, at))
        .catch(() => {
          showToast(fallbackToast, 'info');
          onStale?.();
        });
    },
    [recordDetail, showToast, onStale]
  );

  const openId = open?.id ?? null;

  /** Re-fetch the open drawer's review (e.g. after it changed elsewhere) */
  const refreshOpen = useCallback(
    (id: string) => {
      if (openId === id) setDrawerRefresh(n => n + 1);
    },
    [openId]
  );

  const onModerated = useCallback(
    (id: string, action: ModerationAction, details: { rejectionReason?: string }) => {
      const nextStatus = ASSUMED_MODERATION_RESULT_STATUS[action];
      if (nextStatus) {
        recordWrite(id, {
          status: nextStatus,
          ...(action === 'REJECT' && details.rejectionReason ? { rejectionReason: details.rejectionReason } : {}),
        });
        refreshOpen(id); // pick up the new history entry
      } else {
        refetchReview(id, 'Review restored. Refreshing the list to show its new status.');
      }
      showToast(MODERATED_TOAST[action], 'success');
    },
    [recordWrite, refetchReview, refreshOpen, showToast]
  );

  const onResponded = useCallback(
    (id: string, adminResponse: ReviewSellerResponse | null) => {
      if (adminResponse) recordWrite(id, { adminResponse });
      else refetchReview(id, 'Response saved. Refreshing the list to show it.');
      showToast('Seller response saved.', 'success');
    },
    [recordWrite, refetchReview, showToast]
  );

  const openDrawer = useCallback((id: string, fallback?: AdminReview, at = 0) => setOpen({ id, fallback, at }), []);
  const openModerate = useCallback((id: string) => setModeratingId(id), []);

  const enrich = lookups?.enrich;
  const show = (review: AdminReview | undefined) => (review && enrich ? enrich(review) : review);
  const rawOpenReview = reviewById(openId);
  const openReview = show(rawOpenReview);
  const moderateTarget = show(reviewById(moderatingId));
  const respondTarget = show(reviewById(respondingId));

  // Look up names for the review shown in the drawer (it may not be in any list)
  const request = lookups?.request;
  const openCustomerId = rawOpenReview?.customer.id;
  const openProductId = rawOpenReview?.product.id;
  useEffect(() => {
    if (request && rawOpenReview) request([rawOpenReview]);
    // Only when the ids that need resolving change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, openCustomerId, openProductId]);

  const layer = (
    <>
      <ReviewDetailDrawer
        key={openId ?? 'closed'}
        reviewId={openId}
        review={openReview}
        onClose={() => setOpen(null)}
        onDetailLoaded={recordDetail}
        refreshToken={drawerRefresh}
        renderActions={review => (
          <div className="flex flex-wrap gap-2">
            {canModerateAction && (
              <button
                type="button"
                onClick={() => setModeratingId(review.id)}
                disabled={!canModerateReview(review)}
                title={canModerateReview(review) ? undefined : 'No moderation actions for this status'}
                className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl bg-[#561C08] hover:bg-[#561C08]/90 text-white text-xs font-sans font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShieldCheck size={14} /> Moderate
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setRespondingId(review.id)}
                className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border border-stone-300 bg-white text-stone-700 hover:bg-stone-100 text-xs font-sans font-bold"
              >
                <MessageSquareReply size={14} /> {review.adminResponse ? 'Edit response' : 'Respond'}
              </button>
            )}
          </div>
        )}
      />

      {moderateTarget && (
        <ModerateReviewModal
          key={`moderate-${moderateTarget.id}`}
          review={moderateTarget}
          onClose={() => setModeratingId(null)}
          onModerated={(action, details) => onModerated(moderateTarget.id, action, details)}
        />
      )}

      {respondTarget && (
        <RespondReviewModal
          key={`respond-${respondTarget.id}`}
          review={respondTarget}
          onClose={() => setRespondingId(null)}
          onResponded={({ adminResponse }) => onResponded(respondTarget.id, adminResponse)}
        />
      )}
    </>
  );

  return { openDrawer, openModerate, refreshOpen, openId, layer };
};
