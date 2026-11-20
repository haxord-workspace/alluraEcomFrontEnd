import api from './api';

export interface CMSPage {
  _id: string;
  title: string;
  slug: string;
  content: string; // HTML string rendered safely
  excerpt?: string;
  status: 'PUBLISHED' | 'DRAFT' | 'SCHEDULED' | string;
  visibility: 'PUBLIC' | 'PRIVATE' | string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CMSPageResponse {
  success: boolean;
  data: CMSPage;
  message?: string;
}

// -----------------------------------------------------------------------------
// TEMPORARILY DISABLED — previous implementation, kept for reference/restore.
// It called the legacy endpoint GET /pages/{slug} (Swagger tag "CMS Public
// (Storefront)"). Replaced by GET /content/{slug} (tag "Public — Content Pages")
// below, which is the endpoint the storefront content pages now use.
// -----------------------------------------------------------------------------
// /**
//  * Fetch a published CMS page by its URL slug.
//  * Endpoint: GET /api/v1/pages/:slug
//  * Cached in Redis by backend for fast response times.
//  * Returns null if the page does not exist (404) or is in draft/scheduled state.
//  */
// export const getCMSPageBySlug = async (slug: string): Promise<CMSPage | null> => {
//   try {
//     const cleanSlug = encodeURIComponent(slug.trim().toLowerCase());
//     const response = await api.get<CMSPageResponse>(`/pages/${cleanSlug}`);
//     if (response.data && response.data.success) {
//       return response.data.data;
//     }
//     return null;
//   } catch (error: any) {
//     if (error.response?.status === 404) {
//       return null;
//     }
//     if (error.response?.data?.message?.toLowerCase().includes('not found')) {
//       return null;
//     }
//     console.error(`[CMS API] Failed to fetch CMS page for slug "${slug}":`, error);
//     throw error;
//   }
// };

// -----------------------------------------------------------------------------
// Public — Content Pages (no auth)
// GET /content/{slug} -> a PUBLISHED + PUBLIC page by slug (not by id); 404 otherwise
// -----------------------------------------------------------------------------

/**
 * TEMPORARY: the slugs shown as links in the footer's "Customer Care" column, in order.
 * The backend has no public list endpoint for content pages yet. When one is added,
 * replace this constant and the body of getFooterContentPages() with a call to it —
 * nothing outside this file needs to change.
 */
export const FOOTER_CONTENT_SLUGS = [
  'shipping-policy',
  'exchange-returns',
  'privacy-policy',
  'terms-and-conditions',
] as const;

/** A content page link for the footer */
export interface ContentPageLink {
  title: string;
  slug: string;
}

/**
 * GET /content/{slug}
 * Resolves to null when the page does not exist or is not published (404).
 * Rejects on any other failure (network, 5xx) so callers can offer a retry.
 */
export const getCMSPageBySlug = async (slug: string): Promise<CMSPage | null> => {
  const cleanSlug = encodeURIComponent(slug.trim().toLowerCase());
  try {
    const response = await api.get<CMSPageResponse>(`/content/${cleanSlug}`);
    const page = response.data?.success ? response.data.data : null;
    return page && page.title ? page : null;
  } catch (error: any) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
};

// Cached for the session so the footer does not refetch on every route change
let footerPagesPromise: Promise<ContentPageLink[]> | null = null;

/**
 * The published pages listed in the footer. Slugs are fetched in parallel; only pages
 * that come back 200 are kept, in FOOTER_CONTENT_SLUGS order. Never rejects.
 */
export const getFooterContentPages = (): Promise<ContentPageLink[]> => {
  if (!footerPagesPromise) {
    footerPagesPromise = Promise.allSettled(FOOTER_CONTENT_SLUGS.map((slug) => getCMSPageBySlug(slug))).then(
      (results) => {
        const pages = results.flatMap((result) =>
          result.status === 'fulfilled' && result.value
            ? [{ title: result.value.title, slug: result.value.slug }]
            : []
        );
        // Every request failed (e.g. offline): don't cache, so a later mount can try again
        if (results.every((result) => result.status === 'rejected')) footerPagesPromise = null;
        return pages;
      }
    );
  }
  return footerPagesPromise;
};

export default {
  getCMSPageBySlug,
  getFooterContentPages,
};
