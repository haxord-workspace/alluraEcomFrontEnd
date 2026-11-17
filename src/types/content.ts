// -----------------------------------------------------------------------------
// Admin CMS — Pages & Policies (confirmed from the live backend's Swagger spec,
// tag "Admin CMS — Pages & Policies").
// -----------------------------------------------------------------------------

/** Confirmed: GET /admin/content's `status` query param enum, also used on list/detail items. */
export type ContentStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'UNPUBLISHED' | 'ARCHIVED' | (string & {});

/** Confirmed: POST /admin/content's `type` enum. */
export type ContentType = 'PAGE' | 'POLICY' | (string & {});

/** The only two values PATCH /admin/content/{id}/status accepts as a target. */
export type ContentPublishStatus = 'DRAFT' | 'PUBLISHED';

export interface ContentListItem {
  id: string;
  title: string;
  slug: string;
  status: ContentStatus;
  type: ContentType;
  createdAt: string;
  updatedAt: string;
}

/** GET /admin/content/{id} — adds the sanitized HTML content body. */
export interface ContentDetail extends ContentListItem {
  content: string;
}

export interface ContentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ContentStatus;
}

export interface ContentListResponse {
  items: ContentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Confirmed: POST /admin/content request body. */
export interface CreateContentPayload {
  title: string;
  slug: string;
  content: string;
  type?: ContentType;
  status?: ContentPublishStatus;
}

/**
 * Confirmed: PATCH /admin/content/{id} request body. `updatedAt` is the
 * optimistic-locking field — send back the value last read for this page;
 * the backend returns 409 if it was saved by someone else in the meantime.
 */
export interface UpdateContentPayload {
  title?: string;
  content?: string;
  slug?: string;
  updatedAt: string;
}

/** Confirmed: PATCH /admin/content/{id}/status request body. */
export interface UpdateContentStatusPayload {
  status: ContentPublishStatus;
}
