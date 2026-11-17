// -----------------------------------------------------------------------------
// Product Reviews: admin service (uses the existing `adminApi` instance, so admin
// auth, token refresh and request guards apply unchanged).
//
// List / detail / reports / analytics responses are undocumented: mapped
// tolerantly in reviewMappers.ts.
// -----------------------------------------------------------------------------

import adminApi from './adminApi';
import { assertReviewsEnabled } from '../config/reviews';
import { getBackendSuccessMessage } from '../utils/apiResponse';
import { buildQueryParams } from '../utils/queryParams';
import {
  mapAdminReviewDetail,
  mapAdminReviewList,
  mapRespondResult,
  mapReviewAnalytics,
  mapReviewReportList,
} from './reviewMappers';
import type {
  ReviewAnalytics,
  ReviewAnalyticsParams,
  AdminReportListParams,
  ReviewReportList,
  AdminReview,
  AdminReviewList,
  AdminReviewListParams,
  ModerateReviewPayload,
  ReconcileRatingsResult,
  ReportDecisionPayload,
  RespondToReviewPayload,
  ReviewMutationResult,
  ReviewSellerResponse,
} from '../types/reviews';

const seg = (id: string) => encodeURIComponent(id);

interface RequestOptions {
  signal?: AbortSignal;
}

/** GET /admin/product-reviews: page, limit, status, productId, rating (the only supported params) */
export const getAdminReviews = async (
  params: AdminReviewListParams = {},
  options: RequestOptions = {}
): Promise<AdminReviewList> => {
  assertReviewsEnabled();
  const response = await adminApi.get('/admin/product-reviews', {
    params: buildQueryParams({
      page: params.page,
      limit: params.limit,
      status: params.status,
      productId: params.productId,
      rating: params.rating,
    }),
    signal: options.signal,
  });
  return mapAdminReviewList(response.data, { page: params.page, limit: params.limit });
};

/** GET /admin/product-reviews/{reviewId} (any status) */
export const getAdminReview = async (reviewId: string, options: RequestOptions = {}): Promise<AdminReview> => {
  assertReviewsEnabled();
  const response = await adminApi.get(`/admin/product-reviews/${seg(reviewId)}`, { signal: options.signal });
  return mapAdminReviewDetail(response.data);
};

/**
 * PATCH /admin/product-reviews/{reviewId}/moderate.
 * rejectionReason is required for REJECT (≤500); 400 on an invalid transition.
 */
export const moderateReview = async (
  reviewId: string,
  payload: ModerateReviewPayload
): Promise<ReviewMutationResult> => {
  assertReviewsEnabled();
  const rejectionReason = payload.rejectionReason?.trim();
  if (payload.action === 'REJECT' && !rejectionReason) {
    throw new Error('A rejection reason is required to reject a review.');
  }
  const response = await adminApi.patch(`/admin/product-reviews/${seg(reviewId)}/moderate`, {
    action: payload.action,
    ...(payload.action === 'REJECT' ? { rejectionReason } : {}),
  });
  return { message: getBackendSuccessMessage(response.data, 'Review updated.') };
};

/**
 * POST /admin/product-reviews/{reviewId}/respond. Adds or replaces the seller response (≤2000).
 * `adminResponse` is set only when the (undocumented) body carries one with a respondedAt;
 * otherwise null and the caller re-fetches the review.
 */
export const respondToReview = async (
  reviewId: string,
  payload: RespondToReviewPayload
): Promise<ReviewMutationResult & { adminResponse: ReviewSellerResponse | null }> => {
  assertReviewsEnabled();
  const response = await adminApi.post(`/admin/product-reviews/${seg(reviewId)}/respond`, {
    message: payload.message.trim(),
  });
  return {
    message: getBackendSuccessMessage(response.data, 'Response saved.'),
    adminResponse: mapRespondResult(response.data),
  };
};

/** GET /admin/product-reviews/reports: page, limit, status (the only supported params) */
export const getReviewReports = async (
  params: AdminReportListParams = {},
  options: RequestOptions = {}
): Promise<ReviewReportList> => {
  assertReviewsEnabled();
  const response = await adminApi.get('/admin/product-reviews/reports', {
    params: buildQueryParams({ page: params.page, limit: params.limit, status: params.status }),
    signal: options.signal,
  });
  return mapReviewReportList(response.data, { page: params.page, limit: params.limit });
};

/** PATCH /admin/product-reviews/reports/{reportId}. Reporting never auto-hides; HIDE_REVIEW is opt-in. */
export const decideReviewReport = async (
  reportId: string,
  payload: ReportDecisionPayload
): Promise<ReviewMutationResult> => {
  assertReviewsEnabled();
  const response = await adminApi.patch(`/admin/product-reviews/reports/${seg(reportId)}`, {
    decision: payload.decision,
    moderationAction: payload.moderationAction ?? 'NONE',
  });
  return { message: getBackendSuccessMessage(response.data, 'Report updated.') };
};

/** GET /admin/product-reviews/analytics: from / to (YYYY-MM-DD), the only supported params */
export const getReviewAnalytics = async (
  params: ReviewAnalyticsParams = {},
  options: RequestOptions = {}
): Promise<ReviewAnalytics> => {
  assertReviewsEnabled();
  const response = await adminApi.get('/admin/product-reviews/analytics', {
    params: buildQueryParams({ from: params.from, to: params.to }),
    signal: options.signal,
  });
  return mapReviewAnalytics(response.data);
};

/**
 * POST /admin/product-reviews/reconcile-ratings → 202 Queued.
 * The recompute runs asynchronously, so this only confirms it was queued.
 */
export const reconcileReviewRatings = async (): Promise<ReconcileRatingsResult> => {
  assertReviewsEnabled();
  const response = await adminApi.post('/admin/product-reviews/reconcile-ratings');
  return {
    queued: response.status === 202,
    message: getBackendSuccessMessage(response.data, 'Reconcile queued. Ratings will update shortly.'),
  };
};
