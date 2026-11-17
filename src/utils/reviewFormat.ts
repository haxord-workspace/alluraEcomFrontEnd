/** Display helpers for the reviews module. */

const DATE_FORMAT = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** "12 Nov 2026", or '' when the date is missing / invalid */
export const formatReviewDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '' : DATE_FORMAT.format(new Date(time));
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

/** "12 Nov 2026, 3:04 pm" (admin views), or '' when missing / invalid */
export const formatReviewDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '' : DATE_TIME_FORMAT.format(new Date(time));
};

/** Up to two initials; "?" when there is no usable name */
export const getReviewerInitials = (name: string | null | undefined): string => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 1) : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return letters.toUpperCase();
};

export const pluralizeReviews = (count: number): string => `${count} ${count === 1 ? 'review' : 'reviews'}`;
