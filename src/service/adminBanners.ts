import adminApi from './adminApi';
import api from './api';
import type { Banner } from '../types';

export type BannerPlacement =
  | 'HOME_HERO'
  | 'HOME_PROMOTION'
  | 'CATEGORY_BANNER'
  | 'COLLECTION_BANNER'
  | 'PRODUCT_PROMOTION'
  | 'SHOP_BANNER'
  | string;

export interface BannerFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED' | string;
  placement?: BannerPlacement;
  isActive?: boolean;
  sortBy?: 'displayOrder' | 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export interface BannerPayload {
  title: string;
  headline?: string;
  subtitle?: string;
  description?: string;
  placement?: BannerPlacement;
  position?: 'Hero' | 'Editorial' | 'Secondary' | string;
  image?: { url: string; alt?: string } | string;
  images?: {
    desktop?: { url: string; alt?: string; width?: number; height?: number };
    mobile?: { url: string; alt?: string; width?: number; height?: number };
  };
  desktopImage?: string;
  mobileImage?: string;
  badge?: string;
  eyebrow?: string;
  offerPill?: string;
  ctaText?: string;
  targetUrl?: string;
  cta?: {
    label: string;
    url: string;
    target?: 'SAME_TAB' | 'NEW_TAB';
  };
  secondaryCtaText?: string;
  secondaryTargetUrl?: string;
  sortOrder?: number;
  displayOrder?: number;
  startAt?: string;
  endAt?: string;
  startDate?: string;
  endDate?: string;
  status?: 'Active' | 'Scheduled' | 'Draft' | 'DRAFT' | 'ACTIVE' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED' | string;
  isActive?: boolean;
  [key: string]: any;
}

export interface ReorderBannersPayload {
  placement: BannerPlacement;
  bannerIds: string[];
}

export interface ScheduleBannerPayload {
  startAt: string;
  endAt?: string;
  [key: string]: any;
}

/**
 * Checks whether an ID string is a valid 24-character hexadecimal MongoDB ObjectId
 */
export const isValidObjectId = (id?: string | null): boolean => {
  return Boolean(id && /^[0-9a-fA-F]{24}$/.test(id.trim()));
};

/**
 * Normalizes an image URL to ensure it conforms to backend strict URL validation
 */
export const normalizeBannerImageUrl = (
  url?: string,
  fallback = ''
): string => {
  if (!url || typeof url !== 'string') return fallback;
  const trimmed = url.trim();

  // Valid absolute web URL
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }

  // Handle local relative paths (e.g. /images/hero-banners/slide-1.jpeg)
  if (trimmed.startsWith('/') || trimmed.startsWith('images/')) {
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}${cleanPath}`;
    }
    return cleanPath;
  }

  // Keep whatever image the user uploaded or entered
  return trimmed || fallback;
};

export type BannerWithMessage = Banner & { _message?: string };

/**
 * Normalizes raw banner responses from the API into our frontend Banner structure
 */
export const mapBanner = (raw: any, message?: string): BannerWithMessage => {
  if (!raw) return raw;
  const id = raw._id || raw.id;
  const desktopImg =
    raw.images?.desktop?.url ||
    (typeof raw.image === 'string' ? raw.image : raw.image?.url) ||
    raw.desktopImage ||
    raw.imageUrl ||
    '';
  const mobileImg =
    raw.images?.mobile?.url ||
    raw.mobileImage ||
    raw.mobileImageUrl ||
    desktopImg;

  // Derive placement <-> position bidirectional compatibility
  const placement =
    raw.placement ||
    (raw.position === 'Hero'
      ? 'HOME_HERO'
      : raw.position === 'Editorial'
      ? 'HOME_PROMOTION'
      : 'HOME_HERO');

  const position =
    raw.position ||
    (placement === 'HOME_HERO'
      ? 'Hero'
      : placement === 'HOME_PROMOTION'
      ? 'Editorial'
      : 'Secondary');

  // Normalize status casing
  let status: 'Active' | 'Scheduled' | 'Draft' = 'Draft';
  const rawStatus = (raw.status || '').toUpperCase();
  if (rawStatus === 'ACTIVE' || rawStatus === 'PUBLISHED') {
    status = 'Active';
  } else if (rawStatus === 'SCHEDULED') {
    status = 'Scheduled';
  }

  const ctaText = raw.cta?.label || raw.ctaText || 'SHOP NOW';
  const targetUrl = raw.cta?.url || raw.targetUrl || raw.link || '/shop';

  return {
    ...raw,
    id,
    title: raw.title || raw.headline || '',
    headline: raw.headline || raw.title || '',
    subtitle: raw.subtitle || raw.description || '',
    description: raw.description || raw.subtitle || '',
    badge: raw.badge || '',
    eyebrow: raw.eyebrow || '',
    offerPill: raw.offerPill || '',
    ctaText,
    targetUrl,
    secondaryCtaText: raw.secondaryCtaText || '',
    secondaryTargetUrl: raw.secondaryTargetUrl || '',
    desktopImage: desktopImg,
    mobileImage: mobileImg,
    image: { url: desktopImg, alt: raw.images?.desktop?.alt || raw.title || '' },
    placement,
    position,
    status,
    startDate: raw.startDate || raw.startAt,
    endDate: raw.endDate || raw.endAt,
    startsAt: raw.startsAt || raw.startAt || raw.startDate,
    endsAt: raw.endsAt || raw.endAt || raw.endDate,
    sortOrder: raw.sortOrder ?? raw.displayOrder ?? 0,
    displayOrder: raw.displayOrder ?? raw.sortOrder ?? 0,
    ...(message ? { _message: message } : {}),
  };
};

/**
 * GET /admin/banners — List banners with filtering, searching, and pagination
 */
export const getAdminBanners = async (params?: BannerFilterParams): Promise<Banner[]> => {
  const response = await adminApi.get('/admin/banners', { params });
  const rawList =
    response.data?.data?.banners ||
    response.data?.banners ||
    response.data?.data ||
    response.data;
  return Array.isArray(rawList) ? rawList.map((item: any) => mapBanner(item)) : [];
};

/**
 * GET /admin/banners/{id} — Get banner details by ID
 */
export const getAdminBanner = async (id: string): Promise<Banner> => {
  const response = await adminApi.get(`/admin/banners/${id}`);
  const data = response.data?.data?.banner || response.data?.data || response.data;
  return mapBanner(data);
};

/**
 * POST /admin/banners — Create a new banner (draft by default)
 */
export const createAdminBanner = async (payload: BannerPayload): Promise<BannerWithMessage> => {
  const placement = payload.placement || (payload.position === 'Editorial' ? 'HOME_PROMOTION' : 'HOME_HERO');
  const desktopUrl = normalizeBannerImageUrl(
    payload.images?.desktop?.url ||
    payload.desktopImage ||
    (typeof payload.image === 'object' ? payload.image?.url : '')
  );
  const mobileUrl = normalizeBannerImageUrl(
    payload.images?.mobile?.url || payload.mobileImage || desktopUrl,
    desktopUrl
  );

  const body: any = {
    title: payload.title || payload.headline || 'Boutique Banner',
    placement,
    description: payload.description || payload.subtitle || '',
    images: {
      desktop: {
        url: desktopUrl,
        alt: payload.title || payload.headline || 'Banner Image',
      },
      mobile: {
        url: mobileUrl,
        alt: payload.title || payload.headline || 'Banner Mobile Image',
      },
    },
    cta: {
      label: payload.ctaText || 'SHOP NOW',
      url: payload.targetUrl || '/shop',
      target: 'SAME_TAB',
    },
    status:
      payload.status === 'Active' || payload.status === 'PUBLISHED'
        ? 'PUBLISHED'
        : payload.status === 'Scheduled' || payload.status === 'SCHEDULED'
        ? 'SCHEDULED'
        : 'DRAFT',
    isActive: payload.status === 'Active' || payload.status === 'PUBLISHED',
    displayOrder: payload.displayOrder ?? payload.sortOrder ?? 0,
  };

  if (payload.startAt || payload.startDate) {
    try {
      body.startAt = new Date(payload.startAt || payload.startDate!).toISOString();
    } catch {
      // keep original if parsing fails
    }
  }
  if (payload.endAt || payload.endDate) {
    try {
      body.endAt = new Date(payload.endAt || payload.endDate!).toISOString();
    } catch {
      // keep original if parsing fails
    }
  }

  const response = await adminApi.post('/admin/banners', body);
  const data = response.data?.data || response.data;
  return mapBanner(data, response.data?.message);
};

/**
 * PATCH /admin/banners/{id} — Update banner metadata
 */
export const updateAdminBanner = async (id: string, payload: Partial<BannerPayload>): Promise<BannerWithMessage> => {
  const body: any = {};
  if (payload.title !== undefined || payload.headline !== undefined) {
    body.title = payload.title || payload.headline;
  }
  if (payload.placement !== undefined) {
    body.placement = payload.placement;
  } else if (payload.position !== undefined) {
    body.placement = payload.position === 'Editorial' ? 'HOME_PROMOTION' : 'HOME_HERO';
  }
  if (payload.description !== undefined || payload.subtitle !== undefined) {
    body.description = payload.description || payload.subtitle;
  }
  if (payload.desktopImage || payload.mobileImage || payload.images || payload.image) {
    const desktopUrl = normalizeBannerImageUrl(
      payload.images?.desktop?.url ||
      payload.desktopImage ||
      (typeof payload.image === 'object' ? payload.image?.url : '')
    );
    const mobileUrl = normalizeBannerImageUrl(
      payload.images?.mobile?.url || payload.mobileImage || desktopUrl,
      desktopUrl
    );
    body.images = {
      desktop: { url: desktopUrl, alt: body.title || 'Banner' },
      mobile: { url: mobileUrl, alt: body.title || 'Banner' },
    };
  }
  if (payload.ctaText !== undefined || payload.targetUrl !== undefined || payload.cta !== undefined) {
    body.cta = {
      label: payload.ctaText || payload.cta?.label || 'SHOP NOW',
      url: payload.targetUrl || payload.cta?.url || '/shop',
      target: payload.cta?.target || 'SAME_TAB',
    };
  }
  if (payload.status !== undefined) {
    body.status =
      payload.status === 'Active' || payload.status === 'PUBLISHED'
        ? 'PUBLISHED'
        : payload.status === 'Scheduled' || payload.status === 'SCHEDULED'
        ? 'SCHEDULED'
        : 'DRAFT';
    body.isActive = payload.status === 'Active' || payload.status === 'PUBLISHED';
  }
  if (payload.displayOrder !== undefined || payload.sortOrder !== undefined) {
    body.displayOrder = payload.displayOrder ?? payload.sortOrder;
  }
  if (payload.startAt || payload.startDate) {
    try {
      body.startAt = new Date(payload.startAt || payload.startDate!).toISOString();
    } catch {
      // ignore
    }
  }
  if (payload.endAt || payload.endDate) {
    try {
      body.endAt = new Date(payload.endAt || payload.endDate!).toISOString();
    } catch {
      // ignore
    }
  }

  const response = await adminApi.patch(`/admin/banners/${id}`, body);
  const data = response.data?.data || response.data;
  return mapBanner(data, response.data?.message);
};

/**
 * DELETE /admin/banners/{id} — Archive / soft delete a banner
 */
export const deleteAdminBanner = async (id: string): Promise<string | undefined> => {
  const response = await adminApi.delete(`/admin/banners/${id}`);
  return response.data?.message;
};

/**
 * PATCH /admin/banners/reorder — Reorder banners within a placement
 */
export const reorderAdminBanners = async (payload: ReorderBannersPayload): Promise<string | undefined> => {
  const response = await adminApi.patch('/admin/banners/reorder', payload);
  return response.data?.message;
};

/**
 * POST /admin/banners/{id}/publish — Publish or schedule a banner
 */
export const publishAdminBanner = async (id: string): Promise<BannerWithMessage> => {
  const response = await adminApi.post(`/admin/banners/${id}/publish`, {});
  const data = response.data?.data || response.data;
  return mapBanner(data, response.data?.message);
};

/**
 * POST /admin/banners/{id}/schedule — Schedule a banner for future publication with BullMQ delayed job
 */
export const scheduleAdminBanner = async (
  id: string,
  payload: ScheduleBannerPayload
): Promise<BannerWithMessage> => {
  const body = {
    startAt: new Date(payload.startAt).toISOString(),
    ...(payload.endAt ? { endAt: new Date(payload.endAt).toISOString() } : {}),
  };
  const response = await adminApi.post(`/admin/banners/${id}/schedule`, body);
  const data = response.data?.data || response.data;
  return mapBanner(data, response.data?.message);
};

/**
 * POST /admin/banners/{id}/unpublish — Unpublish a banner (revert to DRAFT and cancel delayed jobs)
 */
export const unpublishAdminBanner = async (id: string): Promise<BannerWithMessage> => {
  const response = await adminApi.post(`/admin/banners/${id}/unpublish`, {});
  const data = response.data?.data || response.data;
  return mapBanner(data, response.data?.message);
};

/**
 * GET /banners — Public storefront endpoint for fetching active banners by placement
 * Example: GET /banners?placement=HOME_HERO
 */
export const getPublicBanners = async (placement: BannerPlacement = 'HOME_HERO'): Promise<Banner[]> => {
  try {
    const response = await api.get('/banners', { params: { placement } });
    const rawList =
      response.data?.data?.banners ||
      response.data?.banners ||
      response.data?.data ||
      response.data;
    return Array.isArray(rawList) ? rawList.map((item: any) => mapBanner(item)) : [];
  } catch (err) {
    console.warn(`[Banner API] Failed to fetch public banners for placement "${placement}":`, err);
    return [];
  }
};
