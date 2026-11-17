// -----------------------------------------------------------------------------
// Product Reviews types. Enum values and field names are taken verbatim from the
// backend Swagger contract (/api/docs). Response types below cover ONLY the
// documented shapes; the undocumented ones (customer list/detail, admin list/detail,
// reports list, analytics) are added once real sample responses are confirmed.
// -----------------------------------------------------------------------------

// ── Enums ────────────────────────────────────────────────────────────────────

export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_SORTS = ['newest', 'oldest', 'highest', 'lowest', 'mostHelpful'] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export const REVIEW_RATINGS = [5, 4, 3, 2, 1] as const;
export type ReviewRating = (typeof REVIEW_RATINGS)[number];

export const REPORT_REASONS = [
  'SPAM',
  'FAKE_REVIEW',
  'INAPPROPRIATE_CONTENT',
  'OFFENSIVE_LANGUAGE',
  'IRRELEVANT_CONTENT',
  'OTHER',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const MODERATION_ACTIONS = ['APPROVE', 'REJECT', 'HIDE', 'RESTORE'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const REPORT_STATUSES = ['PENDING', 'REVIEWED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_DECISIONS = ['REVIEWED', 'DISMISSED'] as const;
export type ReportDecision = (typeof REPORT_DECISIONS)[number];

export const REPORT_MODERATION_ACTIONS = ['NONE', 'HIDE_REVIEW'] as const;
export type ReportModerationAction = (typeof REPORT_MODERATION_ACTIONS)[number];

// ── Display labels (UI copy for the enums above) ─────────────────────────────

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  HIDDEN: 'Hidden',
};

export const REVIEW_SORT_LABELS: Record<ReviewSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  highest: 'Highest rated',
  lowest: 'Lowest rated',
  mostHelpful: 'Most helpful',
};

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: 'Spam',
  FAKE_REVIEW: 'Fake review',
  INAPPROPRIATE_CONTENT: 'Inappropriate content',
  OFFENSIVE_LANGUAGE: 'Offensive language',
  IRRELEVANT_CONTENT: 'Irrelevant content',
  OTHER: 'Other',
};

export const MODERATION_ACTION_LABELS: Record<ModerationAction, string> = {
  APPROVE: 'Approve',
  REJECT: 'Reject',
  HIDE: 'Hide',
  RESTORE: 'Restore',
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: 'Pending',
  REVIEWED: 'Reviewed',
  DISMISSED: 'Dismissed',
};

// ── Documented response models (UI shape) ────────────────────────────────────

/** Swagger: ReviewImage */
export interface ReviewImage {
  url: string;
  thumbnailUrl: string;
  alt: string;
}

/** Swagger: ReviewListItem.adminResponse */
export interface ReviewSellerResponse {
  message: string;
  respondedAt: string | null;
}

/** Swagger: ReviewListItem (GET /products/{productId}/reviews, APPROVED only) */
export interface PublicReview {
  id: string;
  rating: number;
  title: string;
  comment: string;
  images: ReviewImage[];
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  adminResponse: ReviewSellerResponse | null;
  /** Swagger: reviewer.name */
  reviewerName: string;
  createdAt: string | null;
}

/** Swagger: ReviewListResponse.pagination */
export interface ReviewPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Swagger: ReviewListResponse */
export interface PublicReviewList {
  reviews: PublicReview[];
  pagination: ReviewPagination;
}

export type ReviewRatingDistribution = Record<ReviewRating, number>;

/** Swagger: ReviewSummary */
export interface ReviewSummary {
  averageRating: number;
  reviewCount: number;
  verifiedPurchasePercentage: number;
  reviewsWithImagesCount: number;
  distribution: ReviewRatingDistribution;
}

/**
 * One of the signed-in customer's own reviews (GET /customer/reviews), any status.
 * UNDOCUMENTED response: optional fields are tolerant reads (see reviewMappers.ts,
 * mapCustomerReview, for which keys are [DOC] vs [ASSUMED]).
 */
export interface CustomerReview {
  id: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  productSlug?: string;
  orderId?: string;
  variantId?: string;
  status: ReviewStatus;
  rating: number;
  title: string;
  comment: string;
  images: ReviewImage[];
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
  adminResponse: ReviewSellerResponse | null;
  /** Shown to the customer only when the response includes it */
  rejectionReason?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CustomerReviewList {
  reviews: CustomerReview[];
  pagination: ReviewPagination;
}

/** One entry of a review's moderation history (admin detail). UNDOCUMENTED: see mapModerationHistory. */
export interface ReviewModerationEntry {
  /** e.g. APPROVE / APPROVED / REJECT, as the backend sends it */
  action?: string;
  actorName?: string;
  at: string | null;
  note?: string;
}

/**
 * A review as the admin sees it (GET /admin/product-reviews[/{id}]), any status.
 * UNDOCUMENTED response: optional fields are tolerant reads (see reviewMappers.ts,
 * mapAdminReview, for which keys are [DOC] vs [ASSUMED]).
 */
export interface AdminReview {
  id: string;
  status: ReviewStatus;
  rating: number;
  title: string;
  comment: string;
  images: ReviewImage[];
  isVerifiedPurchase?: boolean;
  helpfulCount?: number;
  adminResponse: ReviewSellerResponse | null;
  rejectionReason?: string;
  product: { id?: string; name?: string; image?: string; slug?: string };
  customer: { id?: string; name?: string; email?: string };
  order: { id?: string; number?: string };
  variantId?: string;
  /** Only when the response provides a count / flag; undefined means "unknown", not "no" */
  reportCount?: number;
  isReported?: boolean;
  history: ReviewModerationEntry[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AdminReviewList {
  reviews: AdminReview[];
  pagination: ReviewPagination;
}

/**
 * A report on a review (GET /admin/product-reviews/reports).
 * UNDOCUMENTED response: tolerant reads, see reviewMappers.ts (mapReviewReport).
 */
export interface ReviewReport {
  id: string;
  status: ReportStatus;
  /** Validated against the enum; undefined when missing or unrecognised (see reasonRaw) */
  reason?: ReportReason;
  /** The raw value when it is not one of the known enum values */
  reasonRaw?: string;
  description?: string;
  reporter: { id?: string; name?: string; email?: string };
  /** The reported review: its id (if any), and the full review only when embedded */
  reviewId?: string;
  review?: AdminReview;
  decision?: ReportDecision;
  moderationAction?: ReportModerationAction;
  decidedAt: string | null;
  createdAt: string | null;
}

export interface ReviewReportList {
  reports: ReviewReport[];
  pagination: ReviewPagination;
}

export const REPORT_DECISION_LABELS: Record<ReportDecision, string> = {
  REVIEWED: 'Mark as reviewed',
  DISMISSED: 'Dismiss',
};

/** A product in the top / lowest rated lists (analytics). Every field is optional. */
export interface AnalyticsProduct {
  id?: string;
  slug?: string;
  name?: string;
  averageRating?: number;
  reviewCount?: number;
}

export interface AnalyticsTrendPoint {
  label: string;
  count: number;
  averageRating?: number;
}

/**
 * GET /admin/product-reviews/analytics, mapped defensively. UNDOCUMENTED: every
 * field is present ONLY when the response provided it (see mapReviewAnalytics).
 * Nothing is defaulted to zero.
 */
export interface ReviewAnalytics {
  totalReviews?: number;
  statusCounts?: Partial<Record<ReviewStatus, number>>;
  averageRating?: number;
  reportedCount?: number;
  verifiedPercentage?: number;
  withImagesCount?: number;
  distribution?: ReviewRatingDistribution;
  topProducts?: AnalyticsProduct[];
  bottomProducts?: AnalyticsProduct[];
  trend?: AnalyticsTrendPoint[];
  /** True when nothing in the response could be mapped */
  isEmpty: boolean;
}

/** POST /reviews/{reviewId}/vote → 200 */
export interface ReviewVoteResult {
  voted: boolean;
  helpfulCount: number;
}

/** Backend `message` from a write call, for toasts. */
export interface ReviewMutationResult {
  message: string;
}

/** POST /admin/product-reviews/reconcile-ratings → 202 Queued */
export interface ReconcileRatingsResult extends ReviewMutationResult {
  queued: boolean;
}

// ── Request params / payloads ────────────────────────────────────────────────

/** GET /products/{productId}/reviews query */
export interface PublicReviewListParams {
  page?: number;
  limit?: number;
  rating?: ReviewRating;
  hasImages?: boolean;
  sort?: ReviewSort;
}

/** POST /products/{productId}/reviews (multipart/form-data) */
export interface CreateReviewPayload {
  orderId: string;
  variantId?: string;
  rating: number;
  title: string;
  comment: string;
  /** Up to 5 JPG/PNG/WebP files, 5MB each */
  images?: File[];
}

/** PATCH /customer/reviews/{reviewId} (JSON; images cannot be changed) */
export interface UpdateReviewPayload {
  rating?: number;
  title?: string;
  comment?: string;
}

/** POST /reviews/{reviewId}/report */
export interface ReportReviewPayload {
  reason: ReportReason;
  description?: string;
}

/** GET /customer/reviews query */
export interface CustomerReviewListParams {
  page?: number;
  limit?: number;
}

/** GET /admin/product-reviews query (the only filters the API supports) */
export interface AdminReviewListParams {
  page?: number;
  limit?: number;
  status?: ReviewStatus;
  productId?: string;
  rating?: ReviewRating;
}

/** PATCH /admin/product-reviews/{reviewId}/moderate. rejectionReason is required for REJECT. */
export type ModerateReviewPayload =
  | { action: 'REJECT'; rejectionReason: string }
  | { action: Exclude<ModerationAction, 'REJECT'>; rejectionReason?: string };

/** POST /admin/product-reviews/{reviewId}/respond */
export interface RespondToReviewPayload {
  message: string;
}

/** GET /admin/product-reviews/reports query */
export interface AdminReportListParams {
  page?: number;
  limit?: number;
  status?: ReportStatus;
}

/** PATCH /admin/product-reviews/reports/{reportId} */
export interface ReportDecisionPayload {
  decision: ReportDecision;
  moderationAction?: ReportModerationAction;
}

/** GET /admin/product-reviews/analytics query (YYYY-MM-DD) */
export interface ReviewAnalyticsParams {
  from?: string;
  to?: string;
}

// ── Errors ───────────────────────────────────────────────────────────────────

export type ReviewErrorKind =
  | 'validation'     // 400 (field errors in fieldErrors when the backend names the field)
  | 'not-eligible'   // 403 on create: no delivered + paid order containing the product
  | 'duplicate'      // 409 on create: already reviewed / on report: already reported
  | 'forbidden'      // 403 elsewhere (not your review, missing admin permission)
  | 'not-found'      // 404
  | 'unauthorized'   // 401 after the interceptor's refresh attempt failed
  | 'rate-limited'   // 429
  | 'network'        // no response (offline, cold backend timeout)
  | 'server'         // 5xx
  | 'disabled'       // REVIEWS_ENABLED is false
  | 'unknown';

export type ReviewErrorContext =
  | 'read'
  | 'create'
  | 'edit'
  | 'delete'
  | 'vote'
  | 'report'
  | 'admin-read'
  | 'admin-write';

export interface ReviewApiError {
  kind: ReviewErrorKind;
  status?: number;
  message: string;
  /** field → message, e.g. { title: '…', comment: '…' } */
  fieldErrors: Record<string, string>;
}
