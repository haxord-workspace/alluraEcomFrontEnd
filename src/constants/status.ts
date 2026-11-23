/**
 * ACTIVE / INACTIVE status shared by admin modules whose backend accepts only
 * these two values (collections, categories). Single source of truth for the
 * dropdowns, list filters, types and request payloads.
 */
export const STATUS_OPTIONS = ['ACTIVE', 'INACTIVE'] as const;

export type ActiveStatus = (typeof STATUS_OPTIONS)[number];

export const STATUS_LABELS: Record<ActiveStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
};

export const isActiveStatus = (value: unknown): value is ActiveStatus =>
  typeof value === 'string' && (STATUS_OPTIONS as readonly string[]).includes(value);

/**
 * Maps any stored value (lowercase, legacy "ARCHIVED", missing…) to a valid status.
 * Uppercased first; anything that still isn't ACTIVE becomes INACTIVE, so hidden
 * items never go live by accident.
 */
export const normalizeActiveStatus = (value: unknown): ActiveStatus => {
  const upper = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return upper === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
};

/** Friendly text when the API rejects a status value */
export const INVALID_STATUS_MESSAGE = `Invalid status. Please choose ${STATUS_OPTIONS.map(s => STATUS_LABELS[s]).join(' or ')}.`;
