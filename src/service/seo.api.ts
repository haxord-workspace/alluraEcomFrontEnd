import adminApi from './adminApi';

export type SEOEntityType = 'PRODUCT' | 'CATEGORY' | 'COLLECTION' | 'CONTENT_PAGE' | 'HOMEPAGE';

export interface SEORobots {
  index: boolean;
  follow: boolean;
}

export interface SEOOpenGraph {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
}

export interface SEOTwitter {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
}

export interface SEOMetadata {
  metaTitle?: string;
  metaDescription?: string;
  canonicalUrl?: string;
  keywords?: string[];
  robots?: SEORobots;
  openGraph?: SEOOpenGraph;
  twitter?: SEOTwitter;
}

export interface SEOResponse {
  success: boolean;
  data: SEOMetadata;
  message?: string;
}

/**
 * Fetch SEO metadata for a specific entity from the backend.
 * Endpoint: GET /api/v1/admin/seo/:entityType/:entityId
 */
export const getEntitySEO = async (
  entityType: SEOEntityType,
  entityId: string
): Promise<SEOMetadata | null> => {
  try {
    const cleanId = encodeURIComponent(entityId.trim());
    const response = await adminApi.get<SEOResponse>(`/admin/seo/${entityType}/${cleanId}`);
    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    console.error(`[SEO API] Failed to fetch SEO for ${entityType}/${entityId}:`, error);
    return null;
  }
};

/**
 * Update/Override SEO metadata for a specific entity.
 * Invalids Redis cache for this entity and sitemap automatically.
 * Endpoint: PUT /api/v1/admin/seo/:entityType/:entityId
 */
export const updateEntitySEO = async (
  entityType: SEOEntityType,
  entityId: string,
  seoData: SEOMetadata
): Promise<SEOMetadata> => {
  const cleanId = encodeURIComponent(entityId.trim());
  const response = await adminApi.put<SEOResponse>(
    `/admin/seo/${entityType}/${cleanId}`,
    seoData
  );
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error(response.data?.message || 'Failed to update SEO metadata');
};

/**
 * Reset SEO metadata to automatic system defaults.
 * Removes explicit MongoDB overrides and invalidates cache.
 * Endpoint: DELETE /api/v1/admin/seo/:entityType/:entityId
 */
export const resetEntitySEO = async (
  entityType: SEOEntityType,
  entityId: string
): Promise<boolean> => {
  const cleanId = encodeURIComponent(entityId.trim());
  const response = await adminApi.delete<{ success: boolean }>(
    `/admin/seo/${entityType}/${cleanId}`
  );
  return !!response.data?.success;
};

export default {
  getEntitySEO,
  updateEntitySEO,
  resetEntitySEO,
};
