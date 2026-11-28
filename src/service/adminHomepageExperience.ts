import adminApi from './adminApi';
import type {
  AdminHomepageExperience,
  HomepageExperienceOptions,
  CreateHomepageExperienceDTO,
  UpdateHomepageExperienceDTO,
  CreateFeatureDTO,
  UpdateFeatureDTO,
  ReorderFeaturesDTO,
  ApiResponse,
} from '../types/homepageExperience';
import { getBackendErrorMessage } from '../utils/apiResponse';

export const SECTION_KEY = 'allura-experience';

const unwrap = <T>(res: any): T => {
  if (res?.data?.data !== undefined) return res.data.data;
  if (res?.data !== undefined) return res.data;
  return res as T;
};

/**
 * Get configuration options (suggested icons, max features, file limits)
 * GET /admin/homepage-sections/options
 */
export const getAdminExperienceOptions = async (): Promise<HomepageExperienceOptions> => {
  const res = await adminApi.get<ApiResponse<HomepageExperienceOptions>>('/admin/homepage-sections/options');
  return unwrap<HomepageExperienceOptions>(res);
};

/**
 * Get the current Allura Experience section
 * GET /admin/homepage-sections/allura-experience
 */
export const getAdminHomepageExperience = async (): Promise<AdminHomepageExperience | null> => {
  try {
    const res = await adminApi.get<ApiResponse<AdminHomepageExperience>>(
      `/admin/homepage-sections/${SECTION_KEY}`
    );
    return unwrap<AdminHomepageExperience>(res);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Create a new Allura Experience section draft
 * POST /admin/homepage-sections
 */
export const createAdminHomepageExperience = async (
  payload: CreateHomepageExperienceDTO
): Promise<AdminHomepageExperience> => {
  const res = await adminApi.post<ApiResponse<AdminHomepageExperience>>(
    '/admin/homepage-sections',
    payload
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Update General Settings & CTA partials
 * PUT /admin/homepage-sections/allura-experience
 */
export const updateAdminHomepageExperience = async (
  payload: UpdateHomepageExperienceDTO
): Promise<AdminHomepageExperience> => {
  const res = await adminApi.put<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}`,
    payload
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Publish / Unpublish section
 * PATCH /admin/homepage-sections/allura-experience/status
 */
export const updateAdminExperienceStatus = async (
  isActive: boolean
): Promise<AdminHomepageExperience> => {
  const res = await adminApi.patch<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/status`,
    { isActive }
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Delete entire section and its media
 * DELETE /admin/homepage-sections/allura-experience
 */
export const deleteAdminHomepageExperience = async (): Promise<void> => {
  await adminApi.delete(`/admin/homepage-sections/${SECTION_KEY}`);
};

/**
 * Upload main media (image or video)
 * POST /admin/homepage-sections/allura-experience/media
 */
export const uploadAdminExperienceMedia = async (
  file: File,
  altText?: string,
  onProgress?: (percent: number) => void
): Promise<AdminHomepageExperience> => {
  const formData = new FormData();
  formData.append('file', file);
  if (altText !== undefined && altText !== null) {
    formData.append('altText', altText);
  }

  const res = await adminApi.post<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/media`,
    formData,
    {
      // adminApi defaults to 'Content-Type: application/json', which makes axios
      // serialize the FormData body to JSON instead of sending it as multipart.
      // Clearing it here lets the browser set the multipart boundary itself.
      headers: { 'Content-Type': undefined },
      timeout: 120000,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Remove main media
 * DELETE /admin/homepage-sections/allura-experience/media
 */
export const deleteAdminExperienceMedia = async (): Promise<AdminHomepageExperience> => {
  const res = await adminApi.delete<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/media`
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Upload video thumbnail
 * POST /admin/homepage-sections/allura-experience/media/thumbnail
 */
export const uploadAdminExperienceThumbnail = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<AdminHomepageExperience> => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await adminApi.post<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/media/thumbnail`,
    formData,
    {
      headers: { 'Content-Type': undefined },
      timeout: 120000,
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    }
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Remove video thumbnail
 * DELETE /admin/homepage-sections/allura-experience/media/thumbnail
 */
export const deleteAdminExperienceThumbnail = async (): Promise<AdminHomepageExperience> => {
  const res = await adminApi.delete<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/media/thumbnail`
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Add a feature highlight
 * POST /admin/homepage-sections/allura-experience/features
 */
export const createAdminExperienceFeature = async (
  payload: CreateFeatureDTO
): Promise<AdminHomepageExperience> => {
  const res = await adminApi.post<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/features`,
    payload
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Update an existing feature highlight
 * PUT /admin/homepage-sections/allura-experience/features/:featureId
 */
export const updateAdminExperienceFeature = async (
  featureId: string,
  payload: UpdateFeatureDTO
): Promise<AdminHomepageExperience> => {
  const res = await adminApi.put<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/features/${featureId}`,
    payload
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Enable or disable a feature highlight
 * PATCH /admin/homepage-sections/allura-experience/features/:featureId/status
 */
export const updateAdminExperienceFeatureStatus = async (
  featureId: string,
  isActive: boolean
): Promise<AdminHomepageExperience> => {
  const res = await adminApi.patch<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/features/${featureId}/status`,
    { isActive }
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Delete a feature highlight
 * DELETE /admin/homepage-sections/allura-experience/features/:featureId
 */
export const deleteAdminExperienceFeature = async (
  featureId: string
): Promise<AdminHomepageExperience> => {
  const res = await adminApi.delete<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/features/${featureId}`
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Reorder feature highlights
 * PATCH /admin/homepage-sections/allura-experience/features/reorder
 */
export const reorderAdminExperienceFeatures = async (
  payload: ReorderFeaturesDTO
): Promise<AdminHomepageExperience> => {
  const res = await adminApi.patch<ApiResponse<AdminHomepageExperience>>(
    `/admin/homepage-sections/${SECTION_KEY}/features/reorder`,
    payload
  );
  return unwrap<AdminHomepageExperience>(res);
};

/**
 * Parse error codes and user-friendly messages
 */
export const formatExperienceErrorMessage = (error: any, fallback: string): string => {
  const code = error?.response?.data?.error?.code;

  switch (code) {
    case 'PERMISSION_DENIED':
      return "You don't have permission to perform this action.";
    case 'HOMEPAGE_SECTION_EXISTS':
      return 'The Allura Experience section already exists.';
    case 'HOMEPAGE_SECTION_NOT_FOUND':
      return 'The section was not found or has been deleted.';
    case 'CTA_INCOMPLETE':
      return 'Both CTA Label and Link destination are required when CTA is enabled.';
    case 'FILE_TOO_LARGE':
      return 'File size exceeds the maximum allowed limit.';
    case 'INVALID_FILE_TYPE':
      return 'Unsupported file format.';
    case 'INVALID_FILE_CONTENT':
      return 'File content is invalid or corrupted.';
    case 'VIDEO_STORAGE_UNAVAILABLE':
      return 'Video storage service is temporarily unavailable. Please try again later.';
    case 'THUMBNAIL_NEEDS_VIDEO':
      return 'A custom thumbnail can only be uploaded for video media.';
    case 'NO_FILE_PROVIDED':
      return 'No file was received. Please select a file and try again.';
    case 'FILE_SENT_AS_JSON':
    case 'INVALID_MULTIPART':
      return 'Upload request was malformed. Please try again or contact support if this persists.';
    case 'UPLOAD_ERROR':
      return 'The file could not be uploaded. Please try again.';
    case 'TOO_MANY_FEATURES':
      return 'A maximum of 12 features can be added to this section.';
    case 'FEATURE_NOT_IN_SECTION':
      return 'One or more features do not belong to this section.';
    default:
      return getBackendErrorMessage(error, fallback);
  }
};
