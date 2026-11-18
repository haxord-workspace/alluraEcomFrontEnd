// -----------------------------------------------------------------------------
// Product Reviews: customer / public service (uses the existing customer `api`
// instance, so auth headers, token refresh and request guards apply unchanged).
//
// GET /customer/reviews[/{id}] responses are undocumented: mapped tolerantly in
// reviewMappers.ts (mapCustomerReviewList / mapCustomerReviewDetail).
// -----------------------------------------------------------------------------

import api from './api';
import { assertReviewsEnabled, REVIEW_LIMITS } from '../config/reviews';
import { buildQueryParams } from '../utils/queryParams';
import { getBackendSuccessMessage } from '../utils/apiResponse';
import {
  mapCustomerReviewDetail,
  mapCustomerReviewList,
  mapPublicReviewList,
  mapReviewSummary,
  mapVoteResult,
} from './reviewMappers';
import type {
  CreateReviewPayload,
  CustomerReview,
  CustomerReviewList,
  CustomerReviewListParams,
  PublicReviewList,
  PublicReviewListParams,
  ReportReviewPayload,
  ReviewMutationResult,
  ReviewSummary,
  ReviewVoteResult,
  UpdateReviewPayload,
} from '../types/reviews';

interface RequestOptions {
  signal?: AbortSignal;
}

const seg = (id: string) => encodeURIComponent(id);

// ── Public ───────────────────────────────────────────────────────────────────

/** GET /products/{productId}/reviews (APPROVED reviews only) */
export const getProductReviews = async (
  productId: string,
  params: PublicReviewListParams = {},
  options: RequestOptions = {}
): Promise<PublicReviewList> => {
  assertReviewsEnabled();
  const response = await api.get(`/products/${seg(productId)}/reviews`, {
    params: buildQueryParams({
      page: params.page,
      limit: params.limit,
      rating: params.rating,
      // Only send hasImages when the filter is on; "false" would mean "without images"
      hasImages: params.hasImages ? true : undefined,
      sort: params.sort,
    }),
    signal: options.signal,
  });
  return mapPublicReviewList(response.data, { page: params.page, limit: params.limit });
};

/** GET /products/{productId}/reviews/summary */
export const getProductReviewSummary = async (
  productId: string,
  options: RequestOptions = {}
): Promise<ReviewSummary> => {
  assertReviewsEnabled();
  const response = await api.get(`/products/${seg(productId)}/reviews/summary`, {
    signal: options.signal,
  });
  return mapReviewSummary(response.data);
};

// ── Customer (auth) ──────────────────────────────────────────────────────────

/** GET /customer/reviews: the customer's own reviews, any status (default limit 20). */
export const getMyReviews = async (
  params: CustomerReviewListParams = {},
  options: RequestOptions = {}
): Promise<CustomerReviewList> => {
  assertReviewsEnabled();
  const response = await api.get('/customer/reviews', {
    params: buildQueryParams({ page: params.page, limit: params.limit }),
    signal: options.signal,
  });
  return mapCustomerReviewList(response.data, { page: params.page, limit: params.limit });
};

/** GET /customer/reviews/{reviewId} */
export const getMyReview = async (reviewId: string, options: RequestOptions = {}): Promise<CustomerReview> => {
  assertReviewsEnabled();
  const response = await api.get(`/customer/reviews/${seg(reviewId)}`, { signal: options.signal });
  return mapCustomerReviewDetail(response.data);
};

/**
 * POST /products/{productId}/reviews (multipart/form-data).
 * 201 → created (status set by the backend; never assumed here); 403 → not a verified purchase; 409 → already reviewed.
 */
export const createProductReview = async (
  productId: string,
  payload: CreateReviewPayload
): Promise<ReviewMutationResult> => {
  assertReviewsEnabled();
  const form = new FormData();
  form.append('orderId', payload.orderId);
  if (payload.variantId) form.append('variantId', payload.variantId);
  form.append('rating', String(payload.rating));
  form.append('title', payload.title.trim());
  form.append('comment', payload.comment.trim());
  (payload.images || []).slice(0, REVIEW_LIMITS.imagesMax).forEach(file => {
    form.append('images', file);
  });

  // The shared instance defaults to application/json, which makes Axios JSON-encode
  // FormData. Declaring multipart here keeps it as FormData; in the browser Axios then
  // drops the header so the boundary is set automatically.
  const response = await api.post(`/products/${seg(productId)}/reviews`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return { message: getBackendSuccessMessage(response.data, 'Thanks! Your review has been posted') };
};

/** PATCH /customer/reviews/{reviewId}. The resulting status is whatever the backend sets (never assumed here). */
export const updateMyReview = async (
  reviewId: string,
  payload: UpdateReviewPayload
): Promise<ReviewMutationResult> => {
  assertReviewsEnabled();
  const body: UpdateReviewPayload = {};
  if (payload.rating !== undefined) body.rating = payload.rating;
  if (payload.title !== undefined) body.title = payload.title.trim();
  if (payload.comment !== undefined) body.comment = payload.comment.trim();

  const response = await api.patch(`/customer/reviews/${seg(reviewId)}`, body);
  return { message: getBackendSuccessMessage(response.data, 'Your review has been updated') };
};

/** DELETE /customer/reviews/{reviewId} */
export const deleteMyReview = async (reviewId: string): Promise<ReviewMutationResult> => {
  assertReviewsEnabled();
  const response = await api.delete(`/customer/reviews/${seg(reviewId)}`);
  return { message: getBackendSuccessMessage(response.data, 'Review deleted.') };
};

/** POST /reviews/{reviewId}/vote. Toggles; a second call withdraws the vote. */
export const toggleReviewHelpfulVote = async (reviewId: string): Promise<ReviewVoteResult> => {
  assertReviewsEnabled();
  const response = await api.post(`/reviews/${seg(reviewId)}/vote`);
  return mapVoteResult(response.data);
};

/** POST /reviews/{reviewId}/report. 409 → already reported. */
export const reportReview = async (
  reviewId: string,
  payload: ReportReviewPayload
): Promise<ReviewMutationResult> => {
  assertReviewsEnabled();
  const description = payload.description?.trim();
  const response = await api.post(`/reviews/${seg(reviewId)}/report`, {
    reason: payload.reason,
    ...(description ? { description } : {}),
  });
  return { message: getBackendSuccessMessage(response.data, 'Thanks. Our team will look into this review.') };
};
