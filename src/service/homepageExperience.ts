import api from './api';
import type { HomepageExperience, ApiResponse } from '../types/homepageExperience';

export const SECTION_KEY = 'allura-experience';

/**
 * Fetch the public Allura Experience section.
 * Returns the section data if published and available.
 * Returns null if the section is not found (404), unpublished, or fails to load.
 */
export const getPublicHomepageExperience = async (): Promise<HomepageExperience | null> => {
  try {
    const response = await api.get<ApiResponse<HomepageExperience>>(
      `/homepage-sections/${SECTION_KEY}`
    );

    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }

    // Direct object without success wrapper
    if (response.data && (response.data as any).sectionKey) {
      return response.data as unknown as HomepageExperience;
    }

    return null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      // 404 is expected when section is draft, unpublished, or not yet created
      return null;
    }
    // Meaningful logging for other network or server errors
    console.warn('[HomepageExperience] Failed to fetch experience section:', error?.message || error);
    return null;
  }
};
