// -----------------------------------------------------------------------------
// Product Reviews: the ONE place where backend responses are mapped to UI types.
//
// Only Swagger-documented field names are read here, with no guessed aliases
// (no `_id` fallbacks, no alternate keys). Missing or mistyped values fall back
// to safe empty defaults so a partial response can never crash a page.
//
// UNDOCUMENTED (tolerant, [ASSUMED]-tagged mappers in the section at the bottom):
//   - GET /customer/reviews            and GET /customer/reviews/{reviewId}
//   - GET /admin/product-reviews       and GET /admin/product-reviews/{reviewId}
//   - GET /admin/product-reviews/reports
//   - GET /admin/product-reviews/analytics
// Write responses (moderate / respond / report decision): see "Write-side assumptions".
//   - GET /admin/product-reviews/analytics
// -----------------------------------------------------------------------------

import {
  REPORT_DECISIONS,
  REPORT_MODERATION_ACTIONS,
  REPORT_REASONS,
  REPORT_STATUSES,
  REVIEW_STATUSES,
} from '../types/reviews';
import type {
  AnalyticsProduct,
  AnalyticsTrendPoint,
  ReviewAnalytics,
  ReportDecision,
  ReportModerationAction,
  ReportReason,
  ReportStatus,
  ReviewReport,
  ReviewReportList,
  AdminReview,
  AdminReviewList,
  CustomerReview,
  CustomerReviewList,
  ModerationAction,
  PublicReview,
  PublicReviewList,
  ReviewImage,
  ReviewPagination,
  ReviewRatingDistribution,
  ReviewSellerResponse,
  ReviewStatus,
  ReviewSummary,
  ReviewVoteResult,
} from '../types/reviews';

// ── Primitive readers ────────────────────────────────────────────────────────

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : {};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

// Control characters except tab (\x09), newline (\x0A) and carriage return (\x0D)
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Plain text only: strips control characters. Rendering stays as React text (never innerHTML). */
const text = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.replace(CONTROL_CHARS, '') : fallback;

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const bool = (value: unknown): boolean => value === true;

const isoOrNull = (value: unknown): string | null =>
  typeof value === 'string' && value && !Number.isNaN(Date.parse(value)) ? value : null;

/** Unwraps the standard `{ success, data }` envelope; returns the body itself when there is no `data` key. */
export const unwrapData = (body: unknown): unknown => {
  const record = asRecord(body);
  return 'data' in record ? record.data : body;
};

// ── Documented shapes ────────────────────────────────────────────────────────

/** Swagger: ReviewImage { url, thumbnailUrl, alt } */
export const mapReviewImage = (raw: unknown): ReviewImage | null => {
  const r = asRecord(raw);
  const url = text(r.url);
  if (!url) return null;
  return {
    url,
    thumbnailUrl: text(r.thumbnailUrl) || url,
    alt: text(r.alt),
  };
};

export const mapReviewImages = (raw: unknown): ReviewImage[] =>
  asArray(raw)
    .map(mapReviewImage)
    .filter((img): img is ReviewImage => img !== null);

/** Swagger: ReviewListItem.adminResponse { message, respondedAt } | null */
export const mapSellerResponse = (raw: unknown): ReviewSellerResponse | null => {
  const r = asRecord(raw);
  const message = text(r.message).trim();
  if (!message) return null;
  return { message, respondedAt: isoOrNull(r.respondedAt) };
};

/** Swagger: ReviewListItem */
export const mapPublicReview = (raw: unknown): PublicReview => {
  const r = asRecord(raw);
  return {
    id: text(r.id),
    rating: Math.min(5, Math.max(0, Math.round(num(r.rating)))),
    title: text(r.title),
    comment: text(r.comment),
    images: mapReviewImages(r.images),
    isVerifiedPurchase: bool(r.isVerifiedPurchase),
    helpfulCount: Math.max(0, num(r.helpfulCount)),
    adminResponse: mapSellerResponse(r.adminResponse),
    reviewerName: text(asRecord(r.reviewer).name).trim(),
    createdAt: isoOrNull(r.createdAt),
  };
};

/** Swagger: ReviewListResponse.pagination { page, limit, total, totalPages } */
export const mapReviewPagination = (
  raw: unknown,
  requested: { page?: number; limit?: number } = {}
): ReviewPagination => {
  const r = asRecord(raw);
  const page = num(r.page, requested.page ?? 1);
  const limit = num(r.limit, requested.limit ?? 10);
  const total = Math.max(0, num(r.total));
  const totalPages = num(r.totalPages, limit > 0 ? Math.ceil(total / limit) : 0);
  return { page, limit, total, totalPages };
};

/** GET /products/{productId}/reviews → { success, data: ReviewListResponse } */
export const mapPublicReviewList = (
  body: unknown,
  requested: { page?: number; limit?: number } = {}
): PublicReviewList => {
  const data = asRecord(unwrapData(body));
  return {
    reviews: asArray(data.reviews)
      .map(mapPublicReview)
      .filter(review => review.id !== ''),
    pagination: mapReviewPagination(data.pagination, requested),
  };
};

/** Swagger: ReviewSummary.distribution { "1".."5": integer } */
const mapDistribution = (raw: unknown): ReviewRatingDistribution => {
  const r = asRecord(raw);
  return {
    5: Math.max(0, num(r['5'])),
    4: Math.max(0, num(r['4'])),
    3: Math.max(0, num(r['3'])),
    2: Math.max(0, num(r['2'])),
    1: Math.max(0, num(r['1'])),
  };
};

/** GET /products/{productId}/reviews/summary → { success, data: ReviewSummary } */
export const mapReviewSummary = (body: unknown): ReviewSummary => {
  const r = asRecord(unwrapData(body));
  return {
    averageRating: Math.min(5, Math.max(0, num(r.averageRating))),
    reviewCount: Math.max(0, num(r.reviewCount)),
    verifiedPurchasePercentage: Math.min(100, Math.max(0, num(r.verifiedPurchasePercentage))),
    reviewsWithImagesCount: Math.max(0, num(r.reviewsWithImagesCount)),
    distribution: mapDistribution(r.distribution),
  };
};

/**
 * POST /reviews/{reviewId}/vote → { voted, helpfulCount }.
 * Swagger shows no `data` envelope here; unwrapData() accepts either form.
 */
export const mapVoteResult = (body: unknown): ReviewVoteResult => {
  const r = asRecord(unwrapData(body));
  return {
    voted: bool(r.voted),
    helpfulCount: Math.max(0, num(r.helpfulCount)),
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// UNDOCUMENTED SHAPES: TOLERANT MAPPERS
// Swagger has no response schema for these endpoints and no sample was provided.
// Every read below is tagged:
//   [DOC]     documented name (from ReviewListItem / ReviewListResponse)
//   [ASSUMED] likely alternative, NOT confirmed against a real response
// A missing field maps to undefined (or a neutral value); the UI handles it.
// ═════════════════════════════════════════════════════════════════════════════

// ── Dev-only shape logger ────────────────────────────────────────────────────
// Logs key names and value TYPES (never values) of the first item, once per
// endpoint. `import.meta.env.DEV` is statically false in production builds, so
// Vite removes this code path entirely.

const loggedShapes = new Set<string>();

const describeShape = (value: unknown, depth = 0): unknown => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return value.length ? [describeShape(value[0], depth + 1)] : '[] (empty)';
  if (typeof value === 'object') {
    if (depth >= 3) return 'object';
    return Object.fromEntries(
      Object.keys(value as UnknownRecord).map(key => [key, describeShape((value as UnknownRecord)[key], depth + 1)])
    );
  }
  return typeof value;
};

export const logResponseShapeOnce = (endpoint: string, body: unknown, firstItem?: unknown) => {
  if (!import.meta.env.DEV) return;
  if (loggedShapes.has(endpoint)) return;
  loggedShapes.add(endpoint);
  const root = asRecord(body);
  console.debug(`[reviews] response shape: ${endpoint}`, {
    envelopeKeys: Object.keys(root),
    dataShape: describeShape(unwrapData(body), 1),
    firstItem: firstItem === undefined ? '(no items)' : describeShape(firstItem),
  });
};

const devWarn = (message: string) => {
  if (import.meta.env.DEV) console.warn(`[reviews] ${message}`);
};

// ── Tolerant helpers ─────────────────────────────────────────────────────────

/** First non-empty string among the candidates */
const firstText = (...candidates: unknown[]): string | undefined => {
  for (const candidate of candidates) {
    const value = text(candidate).trim();
    if (value) return value;
  }
  return undefined;
};

/** An id that may be a plain string or a populated object ({ id } / { _id }) */
const idOf = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value.trim() || undefined;
  const r = asRecord(value);
  return firstText(r.id, r._id); // [ASSUMED] populated-object form
};

/** An image that may be a URL string or { url } */
const imageUrlOf = (value: unknown): string | undefined =>
  typeof value === 'string' ? value.trim() || undefined : firstText(asRecord(value).url, asRecord(value).secureUrl);

/**
 * Items of a list response, whichever envelope it uses. [ASSUMED]
 *   data.reviews [DOC model] | data.items | data.results | data.docs | data.data | data (array) | body (array)
 */
export const extractListItems = (body: unknown, preferredKey = 'reviews'): unknown[] => {
  if (Array.isArray(body)) return body;
  const data = unwrapData(body);
  if (Array.isArray(data)) return data;
  const r = asRecord(data);
  for (const key of [preferredKey, 'items', 'results', 'docs', 'data']) {
    if (Array.isArray(r[key])) return r[key] as unknown[];
  }
  return [];
};

/**
 * Pagination of a list response. [ASSUMED]
 *   data.pagination [DOC model] | data.meta | body.meta | top-level page/limit/total/totalPages
 * totalPages is computed from total / limit when missing.
 */
export const extractPagination = (
  body: unknown,
  itemCount: number,
  requested: { page?: number; limit?: number } = {}
): ReviewPagination => {
  const root = asRecord(body);
  const data = asRecord(unwrapData(body));
  const source =
    [data.pagination, data.meta, root.meta, root.pagination].map(asRecord).find(r => Object.keys(r).length > 0) ||
    (typeof data.total === 'number' ? data : typeof root.total === 'number' ? root : {});
  const r = asRecord(source);
  const page = num(r.page, num(r.currentPage, requested.page ?? 1));
  const limit = num(r.limit, num(r.pageSize, num(r.perPage, requested.limit ?? Math.max(itemCount, 1))));
  const total = Math.max(0, num(r.total, num(r.totalCount, num(r.totalItems, itemCount))));
  const totalPages = num(r.totalPages, num(r.pages, limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1));
  return { page, limit, total, totalPages };
};

/** Uppercased and validated against the enum; unknown → PENDING (dev warning). */
export const mapReviewStatus = (value: unknown, context: string): ReviewStatus => {
  const upper = text(value).trim().toUpperCase();
  if ((REVIEW_STATUSES as readonly string[]).includes(upper)) return upper as ReviewStatus;
  devWarn(`${context}: unrecognised review status ${upper ? `"${upper}"` : '(missing)'}; treating as PENDING.`);
  return 'PENDING';
};

// ── GET /customer/reviews  and  GET /customer/reviews/{reviewId} ─────────────

/** One of the signed-in customer's own reviews (any status). */
export const mapCustomerReview = (raw: unknown): CustomerReview => {
  const r = asRecord(raw);
  const product = asRecord(r.product);                 // [ASSUMED] nested product object
  const populatedProduct = asRecord(r.productId);      // [ASSUMED] productId populated as an object
  const productImages = asArray(product.images).length ? asArray(product.images) : asArray(populatedProduct.images);

  return {
    id: firstText(r.id, r._id) || '',                  // [DOC] id | [ASSUMED] _id
    productId:
      idOf(r.productId) ||                             // [ASSUMED] productId string or populated object
      idOf(r.product),                                 // [ASSUMED] product.id / product._id / product string
    productName: firstText(
      product.name, product.title,                     // [ASSUMED]
      populatedProduct.name, populatedProduct.title,   // [ASSUMED]
      r.productName                                    // [ASSUMED]
    ),
    productImage:
      imageUrlOf(product.image) ||                     // [ASSUMED]
      imageUrlOf(productImages[0]) ||                  // [ASSUMED] images[0] (string or { url })
      imageUrlOf(product.thumbnail) ||                 // [ASSUMED]
      imageUrlOf(populatedProduct.image) ||            // [ASSUMED]
      imageUrlOf(populatedProduct.thumbnail) ||        // [ASSUMED]
      imageUrlOf(r.productImage),                      // [ASSUMED]
    productSlug: firstText(product.slug, populatedProduct.slug, r.productSlug), // [ASSUMED]
    orderId: idOf(r.orderId) || idOf(r.order),         // [ASSUMED] (orderId is a documented POST field)
    variantId: idOf(r.variantId) || idOf(r.variant),   // [ASSUMED] (variantId is a documented POST field)
    status: mapReviewStatus(r.status, 'GET /customer/reviews'), // [ASSUMED] key "status"; enum per admin filter
    rating: Math.min(5, Math.max(0, Math.round(num(r.rating)))), // [DOC]
    title: text(r.title),                              // [DOC]
    comment: text(r.comment),                          // [DOC]
    images: mapReviewImages(r.images),                 // [DOC]
    isVerifiedPurchase: r.isVerifiedPurchase === undefined ? undefined : bool(r.isVerifiedPurchase), // [DOC]
    helpfulCount: typeof r.helpfulCount === 'number' ? Math.max(0, r.helpfulCount) : undefined,      // [DOC]
    adminResponse: mapSellerResponse(r.adminResponse), // [DOC]
    rejectionReason: firstText(r.rejectionReason, asRecord(r.moderation).rejectionReason), // [ASSUMED]
    createdAt: isoOrNull(r.createdAt),                 // [DOC]
    updatedAt: isoOrNull(r.updatedAt),                 // [ASSUMED]
  };
};

export const mapCustomerReviewList = (
  body: unknown,
  requested: { page?: number; limit?: number } = {}
): CustomerReviewList => {
  const items = extractListItems(body, 'reviews');
  logResponseShapeOnce('GET /customer/reviews', body, items[0]);
  const reviews = items.map(mapCustomerReview).filter(review => review.id !== '');
  const missingProductId = reviews.filter(review => !review.productId).length;
  if (missingProductId > 0) {
    devWarn(
      `GET /customer/reviews: ${missingProductId}/${reviews.length} items have no productId ` +
        '(checked productId, product.id, product._id). "Already reviewed" matching falls back to the 409 response.'
    );
  }
  return { reviews, pagination: extractPagination(body, items.length, requested) };
};

/** GET /customer/reviews/{reviewId}: the review may be at data, data.review or the body itself. [ASSUMED] */
export const mapCustomerReviewDetail = (body: unknown): CustomerReview => {
  const data = asRecord(unwrapData(body));
  const raw = Object.keys(asRecord(data.review)).length ? data.review : data;
  logResponseShapeOnce('GET /customer/reviews/{reviewId}', body, raw);
  return mapCustomerReview(raw);
};

// ── GET /admin/product-reviews  and  GET /admin/product-reviews/{reviewId} ───

const joinName = (value: unknown): string | undefined => {
  const r = asRecord(value);
  const joined = [text(r.firstName).trim(), text(r.lastName).trim()].filter(Boolean).join(' ');
  return joined || undefined;
};

/** Moderation history entries. [ASSUMED] every key below */
const mapModerationHistory = (raw: UnknownRecord): AdminReview['history'] => {
  const moderation = asRecord(raw.moderation);
  const list = [raw.moderationHistory, raw.history, raw.statusHistory, moderation.history].find(Array.isArray) as
    | unknown[]
    | undefined;
  return (list || []).map(entry => {
    const h = asRecord(entry);
    const actor = asRecord(h.by ?? h.actor ?? h.moderator ?? h.admin);
    return {
      action: firstText(h.action, h.status, h.to, h.type),
      actorName: firstText(actor.name, actor.displayName, joinName(actor), h.moderatorName, h.adminName, h.actorName),
      at: isoOrNull(h.at ?? h.createdAt ?? h.timestamp ?? h.changedAt ?? h.date),
      note: firstText(h.note, h.reason, h.rejectionReason, h.message),
    };
  });
};

/** One review as the admin sees it (any status). */
export const mapAdminReview = (raw: unknown): AdminReview => {
  const r = asRecord(raw);

  const product = asRecord(r.product);                       // [ASSUMED] nested product
  const populatedProduct = asRecord(r.productId);            // [ASSUMED] productId populated as object
  const productImages = asArray(product.images).length ? asArray(product.images) : asArray(populatedProduct.images);

  const customer = asRecord(r.customer ?? r.user);           // [ASSUMED] nested customer / user
  const populatedCustomer = asRecord(r.customerId ?? r.userId); // [ASSUMED] populated ids
  const reviewer = asRecord(r.reviewer);                     // [DOC] reviewer.name (public list model)

  const order = asRecord(r.order);                           // [ASSUMED]
  const populatedOrder = asRecord(r.orderId);                // [ASSUMED]

  const reportsArray = Array.isArray(r.reports) ? r.reports : undefined; // [ASSUMED]
  const reportCountRaw = [r.reportCount, r.reportsCount, r.openReportCount, r.pendingReportCount].find(
    v => typeof v === 'number'
  ) as number | undefined;                                   // [ASSUMED]
  const reportCount = reportCountRaw ?? (reportsArray ? reportsArray.length : undefined);
  const isReported =
    typeof r.isReported === 'boolean' ? r.isReported :       // [ASSUMED]
    typeof r.reported === 'boolean' ? r.reported :           // [ASSUMED]
    reportCount !== undefined ? reportCount > 0 : undefined;

  return {
    id: firstText(r.id, r._id) || '',                        // [DOC] id | [ASSUMED] _id
    status: mapReviewStatus(r.status, 'GET /admin/product-reviews'), // [ASSUMED] key; enum [DOC] (status filter)
    rating: Math.min(5, Math.max(0, Math.round(num(r.rating)))), // [DOC]
    title: text(r.title),                                    // [DOC]
    comment: text(r.comment),                                // [DOC]
    images: mapReviewImages(r.images),                       // [DOC]
    isVerifiedPurchase: r.isVerifiedPurchase === undefined ? undefined : bool(r.isVerifiedPurchase), // [DOC]
    helpfulCount: typeof r.helpfulCount === 'number' ? Math.max(0, r.helpfulCount) : undefined,      // [DOC]
    adminResponse: mapSellerResponse(r.adminResponse),       // [DOC]
    rejectionReason: firstText(r.rejectionReason, asRecord(r.moderation).rejectionReason), // [ASSUMED] (rejectionReason is a documented PATCH field)
    product: {
      id: idOf(r.productId) || idOf(r.product),              // [ASSUMED]
      name: firstText(product.name, product.title, populatedProduct.name, populatedProduct.title, r.productName), // [ASSUMED]
      image:
        imageUrlOf(product.image) || imageUrlOf(productImages[0]) || imageUrlOf(product.thumbnail) ||
        imageUrlOf(populatedProduct.thumbnail) || imageUrlOf(r.productImage), // [ASSUMED]
      slug: firstText(product.slug, populatedProduct.slug, r.productSlug), // [ASSUMED]
    },
    customer: {
      id: idOf(r.customerId) || idOf(r.customer) || idOf(r.userId) || idOf(r.user), // [ASSUMED]
      name: firstText(
        customer.name, customer.fullName, customer.displayName, joinName(customer),                    // [ASSUMED]
        populatedCustomer.name, populatedCustomer.fullName, populatedCustomer.displayName, joinName(populatedCustomer), // [ASSUMED]
        r.customerName,                                      // [ASSUMED]
        reviewer.name                                        // [DOC] (public list model)
      ),
      email: firstText(customer.email, populatedCustomer.email, r.customerEmail), // [ASSUMED]
    },
    order: {
      id: idOf(r.orderId) || idOf(r.order),                  // [ASSUMED] (orderId is a documented POST field)
      number: firstText(order.orderNumber, populatedOrder.orderNumber, r.orderNumber), // [ASSUMED]
    },
    variantId: idOf(r.variantId) || idOf(r.variant),         // [ASSUMED]
    reportCount,
    isReported,
    history: mapModerationHistory(r),
    createdAt: isoOrNull(r.createdAt),                       // [DOC]
    updatedAt: isoOrNull(r.updatedAt),                       // [ASSUMED]
  };
};

export const mapAdminReviewList = (
  body: unknown,
  requested: { page?: number; limit?: number } = {}
): AdminReviewList => {
  const items = extractListItems(body, 'reviews');
  logResponseShapeOnce('GET /admin/product-reviews', body, items[0]);
  return {
    reviews: items.map(mapAdminReview).filter(review => review.id !== ''),
    pagination: extractPagination(body, items.length, requested),
  };
};

/** GET /admin/product-reviews/{reviewId}: the review may be at data, data.review or the body. [ASSUMED] */
export const mapAdminReviewDetail = (body: unknown): AdminReview => {
  const data = asRecord(unwrapData(body));
  const raw = Object.keys(asRecord(data.review)).length ? data.review : data;
  logResponseShapeOnce('GET /admin/product-reviews/{reviewId}', body, raw);
  return mapAdminReview(raw);
};

// ── Write-side assumptions (moderate / respond) ──────────────────────────────
// Swagger documents the request bodies only. Valid transitions and the response
// bodies are NOT documented, so everything below is [ASSUMED].

/**
 * [ASSUMED] "Valid actions per status" table: the only actions the UI offers.
 * Reviews are public on submit (product decision), so moderation is take-down /
 * put-back: APPROVED → Hide, Reject; HIDDEN and REJECTED → Restore. PENDING only
 * exists for legacy reviews (created before the backend change) and also offers
 * Approve so they are not stuck. The backend stays the authority: its 400 for an
 * invalid transition is shown in the modal.
 */
export const ASSUMED_MODERATION_TRANSITIONS: Readonly<Record<ReviewStatus, readonly ModerationAction[]>> = {
  PENDING: ['APPROVE', 'HIDE', 'REJECT'],
  APPROVED: ['HIDE', 'REJECT'],
  REJECTED: ['RESTORE'],
  HIDDEN: ['RESTORE'],
};

/** True when the assumed transition table offers at least one action for the review's status */
export const canModerateReview = (review: Pick<AdminReview, 'status'>): boolean =>
  (ASSUMED_MODERATION_TRANSITIONS[review.status] ?? []).length > 0;

/**
 * [ASSUMED] Status a successful action leaves the review in (applied in place).
 * RESTORE is null: its resulting status is undocumented, so the review is re-fetched.
 */
export const ASSUMED_MODERATION_RESULT_STATUS: Readonly<Record<ModerationAction, ReviewStatus | null>> = {
  APPROVE: 'APPROVED',
  REJECT: 'REJECTED',
  HIDE: 'HIDDEN',
  RESTORE: null,
};

/**
 * POST /admin/product-reviews/{id}/respond → seller response, if the body carries one.
 * [ASSUMED] candidates: data.adminResponse | data.review.adminResponse | data itself.
 * Requires a message AND a valid respondedAt; otherwise null, and the caller re-fetches
 * the review instead of inventing a timestamp. The envelope's own `message` (the API
 * success text) is never read as the response.
 */
export const mapRespondResult = (body: unknown): ReviewSellerResponse | null => {
  const root = asRecord(body);
  if (!('data' in root)) return null;
  const data = asRecord(root.data);
  const candidates = [data.adminResponse, asRecord(data.review).adminResponse, data];
  for (const candidate of candidates) {
    const mapped = mapSellerResponse(candidate);
    if (mapped && mapped.respondedAt) return mapped;
  }
  return null;
};

// ── GET /admin/product-reviews/reports ───────────────────────────────────────

/** Report status, uppercased and validated; unknown → PENDING (dev warning). [ASSUMED] key "status" */
export const mapReportStatus = (value: unknown): ReportStatus => {
  const upper = text(value).trim().toUpperCase();
  if ((REPORT_STATUSES as readonly string[]).includes(upper)) return upper as ReportStatus;
  devWarn(`GET /admin/product-reviews/reports: unrecognised report status ${upper ? `"${upper}"` : '(missing)'}; treating as PENDING.`);
  return 'PENDING';
};

/** An object counts as an embedded review only if it carries review content, not just an id */
const looksLikeReview = (value: unknown): boolean => {
  const r = asRecord(value);
  return ['rating', 'title', 'comment', 'status'].some(key => key in r);
};

/** One report. */
export const mapReviewReport = (raw: unknown): ReviewReport => {
  const r = asRecord(raw);

  // Review: embedded object (review | reviewId populated) or only an id   [ASSUMED]
  const embeddedSource = [r.review, r.reviewId].find(looksLikeReview);
  const review = embeddedSource ? mapAdminReview(embeddedSource) : undefined;
  const reviewId = idOf(r.reviewId) || idOf(r.review) || review?.id || undefined;

  // Reporter: nested or populated, else flat fields   [ASSUMED]
  const reporter = asRecord(r.reporter ?? r.reportedBy ?? r.user ?? r.customer);
  const populatedReporter = asRecord(r.reporterId ?? r.userId ?? r.customerId);

  const reasonUpper = text(r.reason).trim().toUpperCase();   // [DOC] request field "reason"
  const reasonKnown = (REPORT_REASONS as readonly string[]).includes(reasonUpper);

  const decisionUpper = text(r.decision).trim().toUpperCase();                 // [ASSUMED] (documented PATCH field)
  const moderationUpper = text(r.moderationAction).trim().toUpperCase();       // [ASSUMED] (documented PATCH field)

  return {
    id: firstText(r.id, r._id) || '',                                          // [ASSUMED] id | _id
    status: mapReportStatus(r.status),
    reason: reasonKnown ? (reasonUpper as ReportReason) : undefined,
    reasonRaw: !reasonKnown && reasonUpper ? reasonUpper : undefined,
    description: firstText(r.description, r.details, r.note),                 // [DOC] description | [ASSUMED] details, note
    reporter: {
      id: idOf(r.reporterId) || idOf(r.reporter) || idOf(r.reportedBy) || idOf(r.userId) || idOf(r.user), // [ASSUMED]
      name: firstText(
        reporter.name, reporter.fullName, reporter.displayName, joinName(reporter),                         // [ASSUMED]
        populatedReporter.name, populatedReporter.fullName, populatedReporter.displayName, joinName(populatedReporter), // [ASSUMED]
        r.reporterName                                                                                       // [ASSUMED]
      ),
      email: firstText(reporter.email, populatedReporter.email, r.reporterEmail), // [ASSUMED]
    },
    reviewId,
    review,
    decision: (REPORT_DECISIONS as readonly string[]).includes(decisionUpper) ? (decisionUpper as ReportDecision) : undefined,
    moderationAction: (REPORT_MODERATION_ACTIONS as readonly string[]).includes(moderationUpper)
      ? (moderationUpper as ReportModerationAction)
      : undefined,
    decidedAt: isoOrNull(r.decidedAt ?? r.reviewedAt ?? r.resolvedAt),        // [ASSUMED]
    createdAt: isoOrNull(r.createdAt),                                         // [ASSUMED]
  };
};

export const mapReviewReportList = (
  body: unknown,
  requested: { page?: number; limit?: number } = {}
): ReviewReportList => {
  const items = extractListItems(body, 'reports');                            // [ASSUMED] data.reports | …
  logResponseShapeOnce('GET /admin/product-reviews/reports', body, items[0]);
  return {
    reports: items.map(mapReviewReport).filter(report => report.id !== ''),
    pagination: extractPagination(body, items.length, requested),
  };
};

/**
 * [ASSUMED] Report status after a successful decision. The decision enum values
 * (REVIEWED / DISMISSED) match the report status enum, so the status is taken to
 * equal the decision. The PATCH response body is not read.
 */
export const ASSUMED_REPORT_DECISION_STATUS: Readonly<Record<ReportDecision, ReportStatus>> = {
  REVIEWED: 'REVIEWED',
  DISMISSED: 'DISMISSED',
};

// ── GET /admin/product-reviews/analytics ─────────────────────────────────────
// Everything here is [ASSUMED]. A field is set ONLY when a finite number (or a
// usable array) was found; nothing is defaulted to zero or computed from guesses.

const finite = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

/** First finite number found under any of `keys`, searching each source in order */
const pickNumber = (sources: UnknownRecord[], keys: string[]): number | undefined => {
  for (const source of sources) {
    for (const key of keys) {
      const value = finite(source[key]);
      if (value !== undefined) return value;
    }
  }
  return undefined;
};

/** First array found under any of `keys`, searching each source in order */
const pickArray = (sources: UnknownRecord[], keys: string[]): unknown[] | undefined => {
  for (const source of sources) {
    for (const key of keys) {
      if (Array.isArray(source[key])) return source[key] as unknown[];
    }
  }
  return undefined;
};

/** Counts by review status: an object keyed by status, an array of { status, count }, or flat keys. [ASSUMED] */
const mapStatusCounts = (sources: UnknownRecord[]): Partial<Record<ReviewStatus, number>> | undefined => {
  const result: Partial<Record<ReviewStatus, number>> = {};
  const assign = (status: unknown, count: unknown) => {
    const upper = text(status).trim().toUpperCase();
    const value = finite(count);
    if ((REVIEW_STATUSES as readonly string[]).includes(upper) && value !== undefined) result[upper as ReviewStatus] = value;
  };

  for (const source of sources) {
    const grouped = source.byStatus ?? source.statusCounts ?? source.countsByStatus ?? source.statuses ?? source.status;
    if (Array.isArray(grouped)) {
      grouped.forEach(entry => {
        const e = asRecord(entry);
        assign(e.status ?? e._id ?? e.key ?? e.label, e.count ?? e.total ?? e.value);
      });
    } else if (grouped && typeof grouped === 'object') {
      Object.entries(grouped as UnknownRecord).forEach(([key, value]) => assign(key, value));
    }
    // Flat keys: pending / pendingCount / PENDING …
    REVIEW_STATUSES.forEach(status => {
      if (result[status] !== undefined) return;
      const lower = status.toLowerCase();
      assign(status, source[lower] ?? source[`${lower}Count`] ?? source[status]);
    });
  }
  return Object.keys(result).length ? result : undefined;
};

/** Rating distribution: object keyed 1–5, or array of { rating, count }. Missing stars in a found distribution → 0. [ASSUMED] */
const mapAnalyticsDistribution = (sources: UnknownRecord[]): ReviewRatingDistribution | undefined => {
  for (const source of sources) {
    const raw = source.distribution ?? source.ratingDistribution ?? source.ratings ?? source.byRating;
    const found: Partial<Record<number, number>> = {};
    if (Array.isArray(raw)) {
      raw.forEach(entry => {
        const e = asRecord(entry);
        const star =
          finite(e.rating) ?? finite(e.stars) ?? finite(e.star) ?? finite(e._id) ??
          (typeof e._id === 'string' ? finite(Number(e._id)) : undefined);
        const count = finite(e.count ?? e.total ?? e.value);
        if (star !== undefined && star >= 1 && star <= 5 && count !== undefined) found[Math.round(star)] = count;
      });
    } else if (raw && typeof raw === 'object') {
      [1, 2, 3, 4, 5].forEach(star => {
        const count = finite((raw as UnknownRecord)[String(star)]);
        if (count !== undefined) found[star] = count;
      });
    }
    if (Object.keys(found).length) {
      return { 5: found[5] ?? 0, 4: found[4] ?? 0, 3: found[3] ?? 0, 2: found[2] ?? 0, 1: found[1] ?? 0 };
    }
  }
  return undefined;
};

/** A ranked product entry. [ASSUMED] every key */
const mapAnalyticsProduct = (raw: unknown): AnalyticsProduct | null => {
  const r = asRecord(raw);
  const product = asRecord(r.product);
  const populated = asRecord(r.productId);
  const entry: AnalyticsProduct = {
    id: idOf(r.productId) || idOf(r.product) || firstText(r.id, r._id),
    slug: firstText(r.slug, product.slug, populated.slug, r.productSlug),
    name: firstText(r.name, r.title, r.productName, product.name, product.title, populated.name, populated.title),
    averageRating: finite(r.averageRating ?? r.avgRating ?? r.average ?? r.rating ?? product.averageRating),
    reviewCount: finite(r.reviewCount ?? r.count ?? r.reviews ?? r.totalReviews ?? product.reviewCount),
  };
  return entry.id || entry.name ? entry : null;
};

const mapProductList = (list: unknown[] | undefined): AnalyticsProduct[] | undefined => {
  if (!list) return undefined;
  const mapped = list.map(mapAnalyticsProduct).filter((p): p is AnalyticsProduct => p !== null);
  return mapped.length ? mapped : undefined;
};

/** A trend label from a date string, a label, or a Mongo-style { year, month, day } group id. [ASSUMED] */
const trendLabel = (e: UnknownRecord): string | undefined => {
  const direct = firstText(e.date, e.day, e.period, e.label, e.week, e.month, typeof e._id === 'string' ? e._id : undefined);
  if (direct) return direct;
  const id = asRecord(e._id);
  const year = finite(id.year);
  if (year === undefined) return undefined;
  const pad = (n: number | undefined) => (n === undefined ? undefined : String(n).padStart(2, '0'));
  return [String(year), pad(finite(id.month)), pad(finite(id.day))].filter(Boolean).join('-');
};

/** Trend series: arrays of { date, count } or { label, value } (+ optional averageRating). [ASSUMED] */
const mapTrend = (sources: UnknownRecord[]): AnalyticsTrendPoint[] | undefined => {
  const keys = ['trends', 'trend', 'timeline', 'series', 'overTime', 'reviewsOverTime', 'daily', 'byDate', 'byDay'];
  let list = pickArray(sources, keys);
  if (!list) {
    // e.g. { trends: { daily: [...] } }: take the first array inside
    for (const source of sources) {
      for (const key of keys) {
        const nested = source[key];
        if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
          const firstArray = Object.values(nested as UnknownRecord).find(Array.isArray);
          if (firstArray) {
            list = firstArray as unknown[];
            break;
          }
        }
      }
      if (list) break;
    }
  }
  if (!list) return undefined;
  const points = list
    .map((entry): AnalyticsTrendPoint | null => {
      const e = asRecord(entry);
      const label = trendLabel(e);
      const count = finite(e.count ?? e.value ?? e.total ?? e.reviews ?? e.reviewCount);
      if (!label || count === undefined) return null;
      const averageRating = finite(e.averageRating ?? e.avgRating ?? e.average);
      return averageRating === undefined ? { label, count } : { label, count, averageRating };
    })
    .filter((p): p is AnalyticsTrendPoint => p !== null);
  return points.length ? points : undefined;
};

export const mapReviewAnalytics = (body: unknown): ReviewAnalytics => {
  const data = asRecord(unwrapData(body));
  logResponseShapeOnce('GET /admin/product-reviews/analytics', body, data);

  // Metrics may sit at the top level or inside a summary-like object [ASSUMED]
  const sources = [data, data.summary, data.overview, data.totals, data.counts, data.stats, data.metrics].map(asRecord);

  const analytics: ReviewAnalytics = {
    totalReviews: pickNumber(sources, ['totalReviews', 'total', 'reviewCount', 'reviewsCount', 'count']),
    statusCounts: mapStatusCounts(sources),
    averageRating: pickNumber(sources, ['averageRating', 'avgRating', 'average', 'overallAverageRating']),
    reportedCount: pickNumber(sources, ['reportedCount', 'reportCount', 'reportsCount', 'reported', 'openReports', 'pendingReports']),
    verifiedPercentage: pickNumber(sources, ['verifiedPurchasePercentage', 'verifiedPercentage', 'verifiedPercent']),
    withImagesCount: pickNumber(sources, ['reviewsWithImagesCount', 'withImagesCount', 'withImages', 'imagesCount']),
    distribution: mapAnalyticsDistribution(sources),
    topProducts: mapProductList(pickArray(sources, ['topProducts', 'topRated', 'topRatedProducts', 'highestRated', 'best'])),
    bottomProducts: mapProductList(
      pickArray(sources, ['bottomProducts', 'lowestRated', 'lowestRatedProducts', 'bottomRated', 'worstProducts', 'worst'])
    ),
    trend: mapTrend(sources),
    isEmpty: false,
  };
  analytics.isEmpty = Object.entries(analytics).every(([key, value]) => key === 'isEmpty' || value === undefined);
  if (analytics.isEmpty) devWarn('GET /admin/product-reviews/analytics: nothing in the response could be mapped (see the shape log above).');
  return analytics;
};

// ── Still pending ────────────────────────────────────────────────────────────
//   mapReviewAnalytics                          GET /admin/product-reviews/analytics
