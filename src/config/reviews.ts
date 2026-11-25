// -----------------------------------------------------------------------------
// Product Reviews module: feature flag and contract limits (frontend-only, additive).
// ON when VITE_REVIEWS_ENABLED is undefined; OFF only when explicitly set to "false".
// When OFF, no review UI, link, sidebar item or route is rendered and every
// review service function refuses to make a request (see assertReviewsEnabled).
// -----------------------------------------------------------------------------

import type { AnyModuleKey } from '../types/settings';

const isOff = (value: string | undefined) => value === 'false';

/** Master switch for the whole Product Reviews module. */
export const REVIEWS_ENABLED = !isOff(import.meta.env.VITE_REVIEWS_ENABLED);

/**
 * RBAC module that gates the admin review sidebar section and routes.
 * UNCONFIRMED KEY — backend must confirm the exact module key.
 * Change only this one line when the backend confirms the key.
 * The backend still enforces product-reviews:* per action (handled as a 403).
 */
export const REVIEWS_ADMIN_MODULE: AnyModuleKey = 'reviews';

/** Customer "My Reviews" page. */
export const MY_REVIEWS_PATH = '/account/reviews';

/** Admin reviews moderation list. */
export const ADMIN_REVIEWS_PATH = '/admin/reviews';

/** Admin reported reviews. */
export const ADMIN_REVIEW_REPORTS_PATH = '/admin/reviews/reports';

/** Admin review analytics + reconcile ratings. */
export const ADMIN_REVIEW_ANALYTICS_PATH = '/admin/reviews/analytics';

/** Thrown by review service calls while the module is switched off. */
export class ReviewsDisabledError extends Error {
  constructor() {
    super('The reviews module is disabled.');
    this.name = 'ReviewsDisabledError';
  }
}

export const assertReviewsEnabled = (): void => {
  if (!REVIEWS_ENABLED) throw new ReviewsDisabledError();
};

/** Limits taken verbatim from the Swagger contract. No minimums beyond "non-empty after trim". */
export const REVIEW_LIMITS = {
  ratingMin: 1,
  ratingMax: 5,
  titleMax: 150,
  commentMax: 3000,
  reportDescriptionMax: 1000,
  rejectionReasonMax: 500,
  responseMessageMax: 2000,
  imagesMax: 5,
  imageMaxBytes: 5 * 1024 * 1024,
  imageMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as readonly string[],
  /** Page size used when loading the customer's own reviews to build the productId cache. */
  myReviewsPageSize: 100,
} as const;
