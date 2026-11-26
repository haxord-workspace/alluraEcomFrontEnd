// -----------------------------------------------------------------------------
// Product Reviews: turns an Axios error into a typed ReviewApiError so the UI can
// show the right message (not eligible, duplicate, no permission, ...) and inline
// field errors. Built on the project's existing apiResponse helpers.
// -----------------------------------------------------------------------------

import { getBackendErrorMessage, getBackendFieldErrors } from '../utils/apiResponse';
import { ReviewsDisabledError } from '../config/reviews';
import type { ReviewApiError, ReviewErrorContext, ReviewErrorKind } from '../types/reviews';

const FRIENDLY: Partial<Record<ReviewErrorKind, string>> = {
  'not-eligible':
    'Only customers with a delivered and paid order for this product can review it.',
  unauthorized: 'Your session has expired. Please sign in again.',
  'rate-limited': 'Too many requests. Please wait a moment and try again.',
  network: 'Reviews are unavailable right now. Please check your connection and retry.',
  server: 'Reviews are temporarily unavailable. Please try again shortly.',
  disabled: 'Reviews are currently unavailable.',
};

const DUPLICATE_BY_CONTEXT: Partial<Record<ReviewErrorContext, string>> = {
  create: 'You have already reviewed this product.',
  report: 'You have already reported this review.',
};

const FORBIDDEN_BY_CONTEXT: Partial<Record<ReviewErrorContext, string>> = {
  edit: 'You can only edit your own reviews.',
  delete: 'You can only delete your own reviews.',
  'admin-read': "You don't have permission to view this.",
  'admin-write': "You don't have permission to do this.",
};

const kindFromStatus = (status: number | undefined, context: ReviewErrorContext): ReviewErrorKind => {
  if (status === undefined) return 'network';
  if (status === 400 || status === 422) return 'validation';
  if (status === 401) return 'unauthorized';
  if (status === 403) return context === 'create' ? 'not-eligible' : 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'duplicate';
  if (status === 429) return 'rate-limited';
  if (status >= 500) return 'server';
  return 'unknown';
};

export const toReviewApiError = (
  error: unknown,
  context: ReviewErrorContext,
  fallback = 'Something went wrong. Please try again.'
): ReviewApiError => {
  if (error instanceof ReviewsDisabledError) {
    return { kind: 'disabled', message: FRIENDLY.disabled!, fieldErrors: {} };
  }

  const err = error as { response?: { status?: number }; code?: string } | undefined;
  // Aborted requests carry no response either; callers ignore them via isReviewRequestAborted()
  const status = err?.response?.status;
  const kind = kindFromStatus(status, context);

  let message: string;
  switch (kind) {
    case 'validation':
      // The backend's own message is specific here (e.g. "Cannot vote on your own review")
      message = getBackendErrorMessage(error, fallback);
      break;
    case 'duplicate':
      message = DUPLICATE_BY_CONTEXT[context] || getBackendErrorMessage(error, fallback);
      break;
    case 'forbidden':
      message = FORBIDDEN_BY_CONTEXT[context] || getBackendErrorMessage(error, fallback);
      break;
    case 'not-found':
      message = 'This review could not be found. It may have been removed.';
      break;
    default:
      message = FRIENDLY[kind] || getBackendErrorMessage(error, fallback);
  }

  return {
    kind,
    status,
    message,
    fieldErrors: kind === 'validation' ? getBackendFieldErrors(error) : {},
  };
};

/** True for requests cancelled through an AbortController (stale filter / unmounted view). */
export const isReviewRequestAborted = (error: unknown): boolean => {
  const err = error as { name?: string; code?: string } | undefined;
  return err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED';
};
