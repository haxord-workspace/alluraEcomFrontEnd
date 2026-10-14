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

/**
 * Fetch a published CMS page by its URL slug.
 * Endpoint: GET /api/v1/pages/:slug
 * Cached in Redis by backend for fast response times.
 * Returns null if the page does not exist (404) or is in draft/scheduled state.
 */
export const getCMSPageBySlug = async (slug: string): Promise<CMSPage | null> => {
  try {
    const cleanSlug = encodeURIComponent(slug.trim().toLowerCase());
    const response = await api.get<CMSPageResponse>(`/pages/${cleanSlug}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    if (error.response?.data?.message?.toLowerCase().includes('not found')) {
      return null;
    }
    console.error(`[CMS API] Failed to fetch CMS page for slug "${slug}":`, error);
    throw error;
  }
};

export default {
  getCMSPageBySlug,
};
