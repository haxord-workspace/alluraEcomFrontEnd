/**
 * Collection statuses accepted by the backend (POST/PATCH /collections).
 * Aliases of the shared ACTIVE / INACTIVE definition in ./status.
 */
import {
  STATUS_OPTIONS,
  STATUS_LABELS,
  isActiveStatus,
  normalizeActiveStatus,
  type ActiveStatus,
} from './status';

export const COLLECTION_STATUSES = STATUS_OPTIONS;
export type CollectionStatus = ActiveStatus;
export const COLLECTION_STATUS_LABELS = STATUS_LABELS;
export const isCollectionStatus = isActiveStatus;
export const normalizeCollectionStatus = normalizeActiveStatus;
