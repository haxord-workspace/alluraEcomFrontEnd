/**
 * Homepage Experience Section — TypeScript Interfaces
 * Separate contracts for public storefront and admin CMS.
 */

// ─── Public Storefront Interfaces ───────────────────────────────────────────

export interface HomepageExperienceMedia {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl: string | null;
  altText: string;
}

export interface HomepageExperienceCTA {
  label: string;
  link: string;
  isEnabled: boolean;
  openInNewTab: boolean;
}

export interface HomepageExperienceFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
}

export interface HomepageExperience {
  sectionKey: string;
  subtitle: string;
  title: string;
  description: string;
  media: HomepageExperienceMedia | null;
  cta: HomepageExperienceCTA;
  features: HomepageExperienceFeature[];
  updatedAt: string;
}

// ─── Admin CMS Interfaces ───────────────────────────────────────────────────

export interface AdminHomepageExperienceMedia {
  type: 'image' | 'video';
  url: string;
  publicId?: string;
  thumbnailUrl?: string | null;
  thumbnailPublicId?: string | null;
  altText: string;
}

export interface AdminHomepageExperienceFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminHomepageExperience {
  id?: string;
  sectionKey: string;
  sectionName: string;
  subtitle: string;
  title: string;
  description: string;
  media: AdminHomepageExperienceMedia | null;
  cta: HomepageExperienceCTA;
  features: AdminHomepageExperienceFeature[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Admin Configuration / Options Interfaces ───────────────────────────────

export interface HomepageExperienceOptions {
  suggestedIcons: string[];
  maxFeatures: number;
  media: {
    image: {
      maxBytes: number;
      formats: string[];
    };
    video: {
      maxBytes: number;
      formats: string[];
    };
  };
}

// ─── Request DTO Interfaces ─────────────────────────────────────────────────

export interface CreateHomepageExperienceDTO {
  sectionKey: string;
  sectionName: string;
  subtitle?: string;
  title: string;
  description?: string;
  cta?: Partial<HomepageExperienceCTA>;
  features?: Array<{
    title: string;
    description?: string;
    icon?: string;
    isActive?: boolean;
    sortOrder?: number;
  }>;
}

export interface UpdateHomepageExperienceDTO {
  sectionName?: string;
  subtitle?: string;
  title?: string;
  description?: string;
  cta?: Partial<HomepageExperienceCTA>;
  media?: AdminHomepageExperienceMedia;
}

export interface CreateFeatureDTO {
  title: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateFeatureDTO {
  title?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ReorderFeatureItem {
  featureId: string;
  sortOrder: number;
}

export interface ReorderFeaturesDTO {
  features: ReorderFeatureItem[];
}

export interface UpdateStatusDTO {
  isActive: boolean;
}

// ─── API Response Envelope ──────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  error?: {
    code?: string;
    details?: any;
    message?: string;
  };
}
